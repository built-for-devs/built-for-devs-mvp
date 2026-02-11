"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  ScoreEvaluation,
  CategoryScore,
  Classification,
  ScoreCategories,
} from "@/lib/score/types";
import { CATEGORY_META } from "@/lib/score/types";

interface ScoreHistoryEntry {
  slug: string;
  finalScore: number;
  classification: string;
  createdAt: string;
  targetUrl: string;
}

interface Props {
  evaluation: ScoreEvaluation;
  previousScore?: number | null;
  scoreHistory?: ScoreHistoryEntry[];
  domain?: string;
}

const classificationStyles: Record<Classification, string> = {
  exceptional: "bg-emerald-100 text-emerald-800 border-emerald-200",
  excellent: "bg-green-100 text-green-800 border-green-200",
  good: "bg-blue-100 text-blue-800 border-blue-200",
  needs_work: "bg-amber-100 text-amber-800 border-amber-200",
  poor: "bg-red-100 text-red-800 border-red-200",
};

const classificationLabels: Record<Classification, string> = {
  exceptional: "Exceptional",
  excellent: "Excellent",
  good: "Good",
  needs_work: "Needs Work",
  poor: "Poor",
};

function getScoreColor(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-blue-500";
  if (score >= 4) return "bg-amber-500";
  return "bg-red-500";
}

export function ScoreReport({ evaluation, previousScore, scoreHistory = [], domain }: Props) {
  const delta = previousScore != null ? evaluation.summary.final_score - previousScore : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">{evaluation.product_name}</h1>
            <p className="text-sm text-muted-foreground">
              {evaluation.target_url} &middot;{" "}
              {new Date(evaluation.score_date).toLocaleDateString()}
            </p>
          </div>
          <div className="text-center">
            <div
              className={`inline-flex items-center rounded-xl border px-6 py-3 ${
                classificationStyles[evaluation.summary.classification]
              }`}
            >
              <span className="text-3xl font-bold">
                {evaluation.summary.final_score}
              </span>
              <span className="ml-1 text-lg text-current/60">/120</span>
            </div>
            <p className="mt-1 text-sm font-medium">
              {classificationLabels[evaluation.summary.classification]}
            </p>
            {delta !== null && (
              <p
                className={`mt-1 text-sm font-medium ${
                  delta > 0
                    ? "text-emerald-600"
                    : delta < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
                }`}
              >
                {delta > 0 ? `+${delta}` : delta === 0 ? "No change" : delta} from previous
              </p>
            )}
          </div>
        </div>
        <p className="text-lg text-muted-foreground">
          {evaluation.summary.one_line_verdict}
        </p>
      </div>

      <Separator />

      {/* Score Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Score Breakdown</h2>
        <div className="space-y-3">
          {(
            Object.entries(evaluation.scores) as [
              keyof ScoreCategories,
              CategoryScore
            ][]
          ).map(([key, cat]) => (
            <CategoryCard key={key} categoryKey={key} category={cat} />
          ))}
        </div>
      </div>

      {/* Red Flags */}
      {evaluation.red_flags.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Red Flags</h2>
            <div className="space-y-3">
              {evaluation.red_flags.map((flag, i) => (
                <Card key={i} className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-red-900">{flag.flag}</p>
                        <p className="mt-1 text-sm text-red-800">
                          {flag.developer_thinking}
                        </p>
                      </div>
                      <Badge variant="destructive" className="shrink-0">
                        {flag.deduction}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Critical Issues */}
      {evaluation.critical_issues.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Critical Issues</h2>
            <div className="space-y-3">
              {evaluation.critical_issues.map((issue, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <p className="font-medium">{issue.issue}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <strong>Impact:</strong> {issue.impact}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Developer behavior:</strong>{" "}
                      {issue.developer_behavior}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Quick Wins */}
      {evaluation.quick_wins.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Quick Wins</h2>
            <div className="space-y-3">
              {evaluation.quick_wins.map((win, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{win.recommendation}</p>
                    <p className="text-sm text-muted-foreground">
                      {win.impact}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {win.effort} effort
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Strategic Opportunities */}
      {evaluation.strategic_opportunities.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Strategic Opportunities</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {evaluation.strategic_opportunities.map((opp, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{opp.area}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>
                      <strong>Gap:</strong> {opp.current_gap}
                    </p>
                    <p>
                      <strong>Impact:</strong> {opp.developer_impact}
                    </p>
                    <p className="text-muted-foreground">
                      {opp.solution_approach}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* What AI Can't Tell You */}
      {evaluation.what_ai_cant_tell_you.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              What This Score Can&apos;t Tell You
            </h2>
            <p className="text-sm text-muted-foreground">
              This evaluation is based on your public-facing web presence. Only
              hands-on testing by real developers can reveal:
            </p>
            <ul className="space-y-2 pl-5">
              {evaluation.what_ai_cant_tell_you.map((item, i) => (
                <li
                  key={i}
                  className="list-disc text-sm text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6 text-center">
                <p className="font-semibold">
                  See what real developers think about your product
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Built for Devs helps companies building developer products
                  get candid insights from their target developers through
                  recorded product evaluations.
                </p>
                <Button asChild className="mt-4">
                  <a href="https://builtfor.dev" target="_blank" rel="noopener noreferrer">
                    Learn About Evaluations
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Score History */}
      {scoreHistory.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Score History for {domain}
            </h2>
            <div className="space-y-2">
              {scoreHistory.map((entry) => {
                const entryDelta =
                  evaluation.summary.final_score - entry.finalScore;
                return (
                  <Link
                    key={entry.slug}
                    href={`/score/${entry.slug}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(entry.createdAt).toLocaleDateString(
                          undefined,
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.targetUrl}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`border-transparent ${
                          classificationStyles[
                            entry.classification as Classification
                          ] ?? ""
                        }`}
                      >
                        {classificationLabels[
                          entry.classification as Classification
                        ] ?? entry.classification}
                      </Badge>
                      <span className="text-sm font-semibold tabular-nums">
                        {entry.finalScore}/120
                      </span>
                      {entryDelta !== 0 && (
                        <span
                          className={`text-xs font-medium ${
                            entryDelta > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {entryDelta > 0 ? "+" : ""}
                          {entryDelta}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <Separator />
      <div className="flex items-center justify-between">
        <Link
          href="/score"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Score another product
        </Link>
        <span className="text-xs text-muted-foreground">
          Powered by Built for Devs
        </span>
      </div>
    </div>
  );
}

// --- Category Card ---

function CategoryCard({
  categoryKey,
  category,
}: {
  categoryKey: keyof ScoreCategories;
  category: CategoryScore;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[categoryKey];

  return (
    <div
      className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-muted/50"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{meta.label}</p>
            <span className="ml-2 text-sm font-semibold tabular-nums">
              {category.score}/{category.max}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${getScoreColor(category.score)}`}
              style={{ width: `${(category.score / category.max) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <p className="text-sm text-muted-foreground">{category.feedback}</p>
          {category.evidence.length > 0 && (
            <ul className="space-y-1 pl-4">
              {category.evidence.map((e, i) => (
                <li
                  key={i}
                  className="list-disc text-xs text-muted-foreground"
                >
                  {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
