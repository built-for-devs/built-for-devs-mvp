import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProjects } from "@/lib/admin/queries";
import { parseProjectFilters } from "@/lib/admin/search-params";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { TextSearch } from "@/components/admin/text-search";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { ProjectStatusFilter } from "./status-filter";
import { CreateProjectDialog } from "./create-project-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseProjectFilters(params);
  const supabase = await createClient();
  const { data: projects, count } = await getProjects(supabase, filters);

  // Fetch company list for the create dialog
  const { data: companyList } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  // Get evaluation counts per project
  const projectIds = projects.map((p) => p.id);
  let evalCounts: Record<string, { total: number; complete: number }> = {};
  if (projectIds.length > 0) {
    const { data: evals } = await supabase
      .from("evaluations")
      .select("project_id, status")
      .in("project_id", projectIds);

    if (evals) {
      for (const ev of evals) {
        if (!evalCounts[ev.project_id]) {
          evalCounts[ev.project_id] = { total: 0, complete: 0 };
        }
        evalCounts[ev.project_id].total++;
        if (["approved", "paid"].includes(ev.status)) {
          evalCounts[ev.project_id].complete++;
        }
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description={`${count} project${count !== 1 ? "s" : ""}`}
      >
        <CreateProjectDialog companies={companyList ?? []} />
      </PageHeader>

      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <Suspense>
            <TextSearch placeholder="Search by product or company name..." />
          </Suspense>
        </div>
        <Suspense>
          <ProjectStatusFilter />
        </Suspense>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">No projects found.</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const ec = evalCounts[project.id] ?? { total: 0, complete: 0 };
                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="font-medium hover:underline"
                        >
                          {project.product_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {project.companies.name}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={project.status} type="project" />
                      </TableCell>
                      <TableCell className="text-sm">
                        {ec.complete}/{project.num_evaluations} complete
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Suspense>
            <PaginationControls totalItems={count} />
          </Suspense>
        </>
      )}
    </div>
  );
}
