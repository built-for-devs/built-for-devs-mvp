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
import { Upload } from "lucide-react";
import { DeveloperTable } from "./developer-table";
import { CollectSixtyFourButton } from "./collect-sixtyfour-button";

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

  // Count pending SixtyFour tasks for the collect button
  const { count: pendingSixtyFour } = await supabase
    .from("developers")
    .select("id", { count: "exact", head: true })
    .not("sixtyfour_task_id", "is", null);

  return (
    <div>
      <PageHeader title="Developers" description={`${count} developer${count !== 1 ? "s" : ""} found`}>
        <CollectSixtyFourButton pendingCount={pendingSixtyFour ?? 0} />
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
            <DeveloperTable developers={developers} />
            <Suspense>
              <PaginationControls totalItems={count} />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}
