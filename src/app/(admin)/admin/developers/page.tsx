import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDevelopersWithProfiles } from "@/lib/admin/queries";
import { parseDeveloperFilters } from "@/lib/admin/search-params";
import { PageHeader } from "@/components/admin/page-header";
import { DeveloperFilterPanel } from "@/components/admin/developer-filter-panel";
import { TextSearch } from "@/components/admin/text-search";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload } from "lucide-react";
import { DeveloperRowEditor } from "./developer-row-editor";

export default async function AdminDevelopersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseDeveloperFilters(params);
  const supabase = await createClient();
  const { data: developers, count } = await getDevelopersWithProfiles(
    supabase,
    filters
  );

  return (
    <div>
      <PageHeader title="Developers" description={`${count} developer${count !== 1 ? "s" : ""} found`}>
        <Link href="/admin/developers/import">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
        </Link>
      </PageHeader>

      <div className="space-y-4">
        <Suspense>
          <TextSearch placeholder="Search by name, company, or job title..." />
        </Suspense>

        <Suspense>
          <DeveloperFilterPanel />
        </Suspense>

        {developers.length === 0 ? (
          <div className="rounded-md border p-8 text-center">
            <p className="text-muted-foreground">
              No developers match your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="max-w-[120px]">Job Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role Types</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Exp</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right">Evals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {developers.map((dev) => (
                    <DeveloperRowEditor key={dev.id} dev={dev} />
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
    </div>
  );
}
