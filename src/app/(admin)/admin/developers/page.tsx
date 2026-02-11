import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getDevelopersWithProfiles } from "@/lib/admin/queries";
import { parseDeveloperFilters } from "@/lib/admin/search-params";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import { PageHeader } from "@/components/admin/page-header";
import { DeveloperFilterPanel } from "@/components/admin/developer-filter-panel";
import { TextSearch } from "@/components/admin/text-search";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload } from "lucide-react";

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
                    <TableHead>Job Title</TableHead>
                    <TableHead>Role Types</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Exp</TableHead>
                    <TableHead>Languages</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead className="text-right">Evals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {developers.map((dev) => (
                    <TableRow key={dev.id}>
                      <TableCell>
                        <Link
                          href={`/admin/developers/${dev.id}`}
                          className="font-medium hover:underline"
                        >
                          {dev.profiles.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {dev.profiles.email}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dev.job_title ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(dev.role_types ?? []).slice(0, 2).map((rt) => (
                            <Badge key={rt} variant="secondary" className="text-xs">
                              {rt}
                            </Badge>
                          ))}
                          {(dev.role_types?.length ?? 0) > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(dev.role_types?.length ?? 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {dev.seniority
                          ? formatEnumLabel(dev.seniority)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {dev.years_experience != null
                          ? `${dev.years_experience}y`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(dev.languages ?? []).slice(0, 3).map((lang) => (
                            <Badge key={lang} variant="outline" className="text-xs">
                              {lang}
                            </Badge>
                          ))}
                          {(dev.languages?.length ?? 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(dev.languages?.length ?? 0) - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dev.current_company ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={dev.is_available ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {dev.is_available ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {dev.total_evaluations}
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
    </div>
  );
}
