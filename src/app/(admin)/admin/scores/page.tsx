import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getScores } from "@/lib/admin/queries";
import { parseScoreFilters } from "@/lib/admin/search-params";
import { PageHeader } from "@/components/admin/page-header";
import { TextSearch } from "@/components/admin/text-search";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { ScoreStatusFilter } from "./status-filter";
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

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  crawling: "bg-blue-100 text-blue-800",
  evaluating: "bg-yellow-100 text-yellow-800",
  complete: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const classificationColors: Record<string, string> = {
  exceptional: "bg-emerald-100 text-emerald-800",
  excellent: "bg-green-100 text-green-800",
  good: "bg-blue-100 text-blue-800",
  needs_work: "bg-amber-100 text-amber-800",
  poor: "bg-red-100 text-red-800",
};

function formatClassification(c: string): string {
  return c
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function AdminScoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseScoreFilters(params);
  const supabase = await createClient();
  const { data: scores, count } = await getScores(supabase, filters);

  return (
    <div>
      <PageHeader
        title="Scores"
        description={`${count} score${count !== 1 ? "s" : ""} submitted`}
      >
        <Button asChild size="sm">
          <Link href="/admin/scores/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Submit Score
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <Suspense>
            <TextSearch placeholder="Search by email, domain, or company..." />
          </Suspense>
        </div>
        <Suspense>
          <ScoreStatusFilter />
        </Suspense>
      </div>

      {scores.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">No scores found.</p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map((score) => (
                  <TableRow key={score.id as string}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {(score.target_domain as string) ?? "—"}
                        </p>
                        {(score.company_name as string | null) && (
                          <p className="text-xs text-muted-foreground">
                            {score.company_name as string}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{score.email as string}</p>
                        {(score.name as string | null) && (
                          <p className="text-xs text-muted-foreground">
                            {score.name as string}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {score.final_score != null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums">
                            {score.final_score as number}/120
                          </span>
                          {(score.classification as string | null) && (
                            <Badge
                              variant="outline"
                              className={`border-transparent text-xs ${classificationColors[score.classification as string] ?? ""}`}
                            >
                              {formatClassification(score.classification as string)}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`border-transparent ${statusColors[score.status as string] ?? ""}`}
                      >
                        {(score.status as string).charAt(0).toUpperCase() +
                          (score.status as string).slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(score.created_at as string).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {score.status === "complete" && (
                        <Link
                          href={`/score/${score.slug as string}`}
                          className="text-sm text-muted-foreground hover:underline"
                          target="_blank"
                        >
                          View report
                        </Link>
                      )}
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
