import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getEvaluations } from "@/lib/admin/queries";
import { parseEvaluationFilters } from "@/lib/admin/search-params";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { TextSearch } from "@/components/admin/text-search";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { EvaluationStatusFilter } from "./status-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminEvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseEvaluationFilters(params);
  const supabase = await createClient();
  const { data: evaluations, count } = await getEvaluations(supabase, filters);

  return (
    <div>
      <PageHeader
        title="Evaluations"
        description={`${count} evaluation${count !== 1 ? "s" : ""}`}
      />

      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <Suspense>
            <TextSearch placeholder="Search by developer or product name..." />
          </Suspense>
        </div>
        <Suspense>
          <EvaluationStatusFilter />
        </Suspense>
      </div>

      {evaluations.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">No evaluations found.</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Developer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <Link
                        href={`/admin/developers/${ev.developers.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {ev.developers.profiles.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ev.projects.product_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ev.projects.companies.name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ev.status} type="evaluation" />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ev.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/projects/${ev.project_id}`}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        View project
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
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
