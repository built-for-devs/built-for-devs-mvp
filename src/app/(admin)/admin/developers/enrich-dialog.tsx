"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Search,
  Sparkles,
  Clock,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Phase = "confirm" | "discovering" | "enriching" | "complete";

interface DiscoveryItem {
  developerId: string;
  name: string;
  status: "searching" | "found" | "submitted" | "no_linkedin" | "already_has_github" | "failed";
  githubUrl?: string;
  taskId?: string;
  source?: string;
}

interface EnrichItem {
  developerId: string;
  name: string;
  status: "enriched" | "partial" | "failed";
  fieldsUpdated?: number;
}

interface EnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developerIds: string[];
  developerNames: Record<string, string>;
  onComplete: () => void;
}

export function EnrichDialog({
  open,
  onOpenChange,
  developerIds,
  developerNames,
  onComplete,
}: EnrichDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("confirm");
  const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([]);
  const [enrichItems, setEnrichItems] = useState<EnrichItem[]>([]);

  function handleClose() {
    onOpenChange(false);
    if (phase === "complete") {
      onComplete();
      router.refresh();
    }
    setTimeout(() => {
      setPhase("confirm");
      setDiscoveryItems([]);
      setEnrichItems([]);
    }, 200);
  }

  // ── Phase 1: GitHub Discovery ──

  async function startDiscovery() {
    setPhase("discovering");
    setDiscoveryItems(
      developerIds.map((id) => ({
        developerId: id,
        name: developerNames[id] ?? "Unknown",
        status: "searching",
      }))
    );

    try {
      const res = await fetch("/api/admin/github-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerIds }),
      });

      if (!res.ok) throw new Error("Discovery request failed");
      const data = await res.json();

      const items: DiscoveryItem[] = data.results.map((r: DiscoveryItem) => ({
        developerId: r.developerId,
        name: r.name,
        status: r.status,
        githubUrl: r.githubUrl,
        taskId: r.taskId,
        source: r.source,
      }));

      setDiscoveryItems(items);

      // Don't poll SixtyFour — proceed to enrichment immediately.
      // SixtyFour results are collected later via "Collect Results" on Developers page.
      startEnrichment();
    } catch {
      setDiscoveryItems((prev) =>
        prev.map((i) => ({ ...i, status: "failed" as const }))
      );
      startEnrichment();
    }
  }

  // ── Phase 2: Enrichment ──

  async function startEnrichment() {
    setPhase("enriching");
    setEnrichItems(
      developerIds.map((id) => ({
        developerId: id,
        name: developerNames[id] ?? "Unknown",
        status: "enriched" as const,
      }))
    );

    try {
      const res = await fetch("/api/admin/re-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerIds }),
      });

      if (!res.ok) throw new Error("Enrichment request failed");
      const data = await res.json();

      const items: EnrichItem[] = data.results.map(
        (r: { id: string; name: string; status: string; data?: { [key: string]: unknown } }) => ({
          developerId: r.id,
          name: r.name,
          status: r.status === "failed" ? "failed" : r.status === "partial" ? "partial" : "enriched",
          fieldsUpdated: r.data ? Object.keys(r.data).filter((k) => r.data![k] != null).length : 0,
        })
      );

      setEnrichItems(items);
      setPhase("complete");
    } catch {
      setEnrichItems((prev) =>
        prev.map((i) => ({ ...i, status: "failed" as const }))
      );
      setPhase("complete");
    }
  }

  // ── Counts ──

  const discoveryFound = discoveryItems.filter(
    (i) => i.status === "found" || i.status === "already_has_github"
  ).length;
  const sixtyfourPending = discoveryItems.filter((i) => i.status === "submitted").length;
  const enrichedCount = enrichItems.filter((i) => i.status === "enriched").length;
  const partialCount = enrichItems.filter((i) => i.status === "partial").length;
  const failedCount = enrichItems.filter((i) => i.status === "failed").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {phase === "confirm" && `Enrich ${developerIds.length} Developer${developerIds.length !== 1 ? "s" : ""}`}
            {phase === "discovering" && "Finding GitHub Profiles..."}
            {phase === "enriching" && "Enriching Profiles..."}
            {phase === "complete" && "Enrichment Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Confirm Phase ── */}
        {phase === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will find GitHub profiles for each developer (via GitHub API,
              Google search, and SixtyFour), then enrich their profiles with AI.
            </p>

            <div className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-sm">
              {developerIds.map((id, i) => (
                <div key={id} className="py-0.5">
                  {i + 1}. {developerNames[id] ?? id}
                </div>
              ))}
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={startDiscovery}>
                <Search className="mr-1.5 h-4 w-4" />
                Find GitHub & Enrich
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Discovery Phase ── */}
        {phase === "discovering" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Step 1/2: Finding GitHub profiles...
            </div>

            <div className="max-h-64 overflow-auto space-y-1.5">
              {discoveryItems.map((item) => (
                <div
                  key={item.developerId}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{item.name}</span>
                  <DiscoveryStatus item={item} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Enriching Phase ── */}
        {phase === "enriching" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Step 2/2: Enriching profiles with GitHub + AI...
            </div>

            <div className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-sm">
              {developerIds.map((id, i) => (
                <div key={id} className="flex items-center gap-2 py-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                  {i + 1}. {developerNames[id] ?? id}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Complete Phase ── */}
        {phase === "complete" && (
          <div className="space-y-4">
            {/* GitHub discovery summary */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1 font-medium">
                <Github className="h-4 w-4" /> GitHub:
              </span>
              {discoveryFound > 0 && (
                <span className="text-green-700">
                  {discoveryFound} found
                </span>
              )}
              {sixtyfourPending > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Clock className="h-3.5 w-3.5" />
                  {sixtyfourPending} pending via SixtyFour
                </span>
              )}
              {discoveryItems.filter((i) => i.status === "failed" || i.status === "no_linkedin").length > 0 && (
                <span className="text-muted-foreground">
                  {discoveryItems.filter((i) => i.status === "failed" || i.status === "no_linkedin").length} not found
                </span>
              )}
            </div>

            {/* Enrichment summary */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="h-4 w-4" /> Enrichment:
              </span>
              {enrichedCount > 0 && (
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle className="h-4 w-4" /> {enrichedCount} enriched
                </span>
              )}
              {partialCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-4 w-4" /> {partialCount} partial
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" /> {failedCount} failed
                </span>
              )}
            </div>

            {sixtyfourPending > 0 && (
              <p className="text-xs text-muted-foreground">
                SixtyFour results will be available in ~5 minutes. Use &quot;Collect SixtyFour Results&quot; on the Developers page to retrieve them, then re-enrich.
              </p>
            )}

            {/* Per-developer results */}
            <div className="max-h-64 overflow-auto space-y-1.5">
              {enrichItems.map((item) => {
                const discovery = discoveryItems.find(
                  (d) => d.developerId === item.developerId
                );
                return (
                  <div
                    key={item.developerId}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{item.name}</span>
                      {discovery?.githubUrl && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {discovery.githubUrl.replace("https://github.com/", "@")}
                          {discovery.source && ` via ${discovery.source}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.fieldsUpdated != null && item.fieldsUpdated > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {item.fieldsUpdated} fields
                        </span>
                      )}
                      {item.status === "enriched" && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {item.status === "partial" && (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                      {item.status === "failed" && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper to show discovery status per developer
function DiscoveryStatus({ item }: { item: DiscoveryItem }) {
  switch (item.status) {
    case "searching":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
        </span>
      );
    case "found":
    case "already_has_github":
      return (
        <span className="flex items-center gap-1 text-xs text-green-700">
          <Github className="h-3.5 w-3.5" />
          {item.githubUrl?.replace("https://github.com/", "@")}
          {item.source && <span className="text-muted-foreground">({item.source})</span>}
        </span>
      );
    case "submitted":
      return (
        <span className="flex items-center gap-1 text-xs text-amber-600">
          <Clock className="h-3.5 w-3.5" /> SixtyFour (pending)
        </span>
      );
    case "no_linkedin":
      return (
        <span className="text-xs text-muted-foreground">No LinkedIn — needs manual</span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5" /> Not found
        </span>
      );
    default:
      return null;
  }
}
