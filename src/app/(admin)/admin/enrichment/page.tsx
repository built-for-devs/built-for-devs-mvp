import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { GroupSelector } from "./group-selector";
import { ContactTable } from "./contact-table";
import { Skeleton } from "@/components/ui/skeleton";

export default async function AdminEnrichmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const groupId =
    typeof params.group === "string"
      ? params.group
      : (params.group?.[0] ?? null);

  return (
    <div>
      <PageHeader
        title="Import from Folk"
        description="Import contacts from Folk CRM as developers in BFD"
      />

      <div className="space-y-4">
        <Suspense>
          <GroupSelector />
        </Suspense>

        {groupId && (
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ContactTable groupId={groupId} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
