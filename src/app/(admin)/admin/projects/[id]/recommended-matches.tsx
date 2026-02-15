"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { assignDeveloperToProject } from "@/lib/admin/actions";
import { formatEnumLabel } from "@/lib/admin/filter-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, Loader2, Send } from "lucide-react";
import type { DeveloperMatch } from "@/lib/admin/icp-matching";

const INITIAL_SHOW = 10;

function scoreBadge(score: number) {
  if (score >= 70) return "bg-green-100 text-green-800 border-transparent";
  if (score >= 40) return "bg-amber-100 text-amber-800 border-transparent";
  return "bg-gray-100 text-gray-700 border-transparent";
}

interface RecommendedMatchesProps {
  matches: DeveloperMatch[];
  projectId: string;
  hasIcpCriteria: boolean;
}

export function RecommendedMatches({
  matches,
  projectId,
  hasIcpCriteria,
}: RecommendedMatchesProps) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [payoutAmount, setPayoutAmount] = useState("149");
  const [error, setError] = useState<string | null>(null);

  const visible = expanded ? matches : matches.slice(0, INITIAL_SHOW);
  const remaining = matches.length - INITIAL_SHOW;

  function handleInvite(developerId: string) {
    setError(null);
    setInvitingId(developerId);
    startTransition(async () => {
      const result = await assignDeveloperToProject(
        projectId,
        developerId,
        parseFloat(payoutAmount) || 175
      );
      if (!result.success) {
        setError(result.error ?? "Failed to invite developer");
        setInvitingId(null);
        return;
      }
      setInvitedIds((prev) => new Set([...prev, developerId]));
      setInvitingId(null);
    });
  }

  if (!hasIcpCriteria) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Developers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No ICP criteria defined. Edit the project to set criteria and see
            developer recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeMatches = visible.filter((m) => !invitedIds.has(m.developer.id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">
            Recommended Developers ({matches.length - invitedIds.size} matches)
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked by ICP match score. Click Invite to assign and send email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="match-payout" className="whitespace-nowrap text-sm">
            Payout $
          </Label>
          <Input
            id="match-payout"
            type="number"
            min="0"
            step="1"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            className="w-24"
          />
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        )}

        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No developers match the current ICP criteria.
          </p>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead className="w-20">Score</TableHead>
                    <TableHead>Top Matches</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Exp</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMatches.map((m) => (
                    <TableRow key={m.developer.id}>
                      <TableCell>
                        <Link
                          href={`/admin/developers/${m.developer.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {m.developer.profiles.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {m.developer.job_title ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={`cursor-help ${scoreBadge(m.score)}`}
                              >
                                {m.score}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="max-w-xs space-y-1 text-xs"
                            >
                              {m.matchDetails.map((d) => (
                                <div key={d.category}>
                                  <span className="font-medium">{d.label}</span>
                                  {": "}
                                  {d.matched
                                    .map((v) => formatEnumLabel(v))
                                    .join(", ")}{" "}
                                  <span className="text-muted-foreground">
                                    (+{d.earned.toFixed(0)})
                                  </span>
                                </div>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.matchDetails.slice(0, 4).flatMap((d) =>
                            d.matched.slice(0, 2).map((v) => (
                              <Badge
                                key={`${d.category}-${v}`}
                                variant="secondary"
                                className="text-xs"
                              >
                                {formatEnumLabel(v)}
                              </Badge>
                            ))
                          ).slice(0, 5)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.developer.seniority
                          ? formatEnumLabel(m.developer.seniority)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.developer.years_experience != null
                          ? `${m.developer.years_experience} yr`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleInvite(m.developer.id)}
                          disabled={isPending && invitingId === m.developer.id}
                        >
                          {isPending && invitingId === m.developer.id ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-1.5 h-4 w-4" />
                          )}
                          Invite
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {remaining > 0 && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="mr-1.5 h-4 w-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1.5 h-4 w-4" />
                      Show {remaining} more
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
