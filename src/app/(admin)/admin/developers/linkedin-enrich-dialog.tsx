"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Linkedin,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface DevStatus {
  developerId: string;
  name: string;
  status: "pending" | "processing" | "enriched" | "partial" | "no_linkedin" | "failed";
  fieldsUpdated: string[];
  error?: string;
}

interface LinkedinEnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developerIds: string[];
  developerNames: Record<string, string>;
  onComplete: () => void;
}

const DELAY_BETWEEN_MS = 8000;

export function LinkedinEnrichDialog({
  open,
  onOpenChange,
  developerIds,
  developerNames,
  onComplete,
}: LinkedinEnrichDialogProps) {
  const router = useRouter();
  const [items, setItems] = useState<DevStatus[]>([]);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const abortRef = useRef(false);
  const startedRef = useRef(false);

  // Start processing when dialog opens
  useEffect(() => {
    if (open && developerIds.length > 0 && !startedRef.current) {
      startedRef.current = true;
      abortRef.current = false;
      startProcessing();
    }
    if (!open) {
      startedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startProcessing() {
    setRunning(true);
    const initial: DevStatus[] = developerIds.map((id) => ({
      developerId: id,
      name: developerNames[id] ?? "Unknown",
      status: "pending",
      fieldsUpdated: [],
    }));
    setItems(initial);

    for (let i = 0; i < developerIds.length; i++) {
      if (abortRef.current) break;

      const devId = developerIds[i];

      // Mark as processing
      setItems((prev) =>
        prev.map((item) =>
          item.developerId === devId ? { ...item, status: "processing" } : item
        )
      );

      try {
        const res = await fetch("/api/admin/linkedin-enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ developerId: devId }),
        });

        const data = await res.json();

        setItems((prev) =>
          prev.map((item) =>
            item.developerId === devId
              ? {
                  ...item,
                  status: data.status ?? "failed",
                  fieldsUpdated: data.fieldsUpdated ?? [],
                  error: data.error,
                }
              : item
          )
        );
      } catch (err) {
        setItems((prev) =>
          prev.map((item) =>
            item.developerId === devId
              ? {
                  ...item,
                  status: "failed",
                  error: err instanceof Error ? err.message : "Request failed",
                }
              : item
          )
        );
      }

      // Wait between developers (except after the last one)
      if (i < developerIds.length - 1 && !abortRef.current) {
        await waitWithCountdown(DELAY_BETWEEN_MS);
      }
    }

    setRunning(false);
    setCountdown(0);
  }

  async function waitWithCountdown(ms: number) {
    const intervalMs = 1000;
    let remaining = ms;
    setCountdown(Math.ceil(remaining / 1000));

    while (remaining > 0 && !abortRef.current) {
      await new Promise((r) => setTimeout(r, intervalMs));
      remaining -= intervalMs;
      setCountdown(Math.max(0, Math.ceil(remaining / 1000)));
    }
    setCountdown(0);
  }

  function handleStop() {
    abortRef.current = true;
    setCountdown(0);
  }

  function handleClose() {
    abortRef.current = true;
    onOpenChange(false);
    if (items.some((i) => i.status === "enriched")) {
      onComplete();
      router.refresh();
    }
    setTimeout(() => {
      setItems([]);
      setRunning(false);
      setCountdown(0);
    }, 200);
  }

  // Counts
  const enrichedCount = items.filter((i) => i.status === "enriched").length;
  const partialCount = items.filter(
    (i) => i.status === "partial" || i.status === "no_linkedin"
  ).length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const doneCount = enrichedCount + partialCount + failedCount;
  const isComplete = !running && items.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5" />
            {isComplete
              ? "LinkedIn Enrichment Complete"
              : `LinkedIn Enrichment (${doneCount}/${developerIds.length})`}
          </DialogTitle>
        </DialogHeader>

        {/* Summary when complete */}
        {isComplete && (
          <div className="flex flex-wrap gap-3 text-sm">
            {enrichedCount > 0 && (
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle className="h-4 w-4" /> {enrichedCount} enriched
              </span>
            )}
            {partialCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-4 w-4" /> {partialCount} no new data
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" /> {failedCount} failed
              </span>
            )}
          </div>
        )}

        {/* Countdown between requests */}
        {countdown > 0 && (
          <div className="text-xs text-muted-foreground">
            Waiting {countdown}s before next request...
          </div>
        )}

        {/* Per-developer status */}
        <div className="max-h-72 overflow-auto space-y-1.5">
          {items.map((item) => (
            <div
              key={item.developerId}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{item.name}</span>
              <StatusBadge item={item} />
            </div>
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          {running ? (
            <Button variant="outline" onClick={handleStop}>
              <Square className="mr-1.5 h-4 w-4" />
              Stop
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={handleClose} disabled={running}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ item }: { item: DevStatus }) {
  switch (item.status) {
    case "pending":
      return (
        <span className="text-xs text-muted-foreground">Waiting...</span>
      );
    case "processing":
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Enriching...
        </span>
      );
    case "enriched":
      return (
        <span className="flex items-center gap-1 text-xs text-green-700">
          <CheckCircle className="h-3.5 w-3.5" />
          {item.fieldsUpdated.length} field{item.fieldsUpdated.length !== 1 ? "s" : ""}
        </span>
      );
    case "partial":
      return (
        <span className="flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle className="h-3.5 w-3.5" /> No empty fields
        </span>
      );
    case "no_linkedin":
      return (
        <span className="flex items-center gap-1 text-xs text-amber-600">
          <AlertCircle className="h-3.5 w-3.5" /> No LinkedIn URL
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5" /> Failed
        </span>
      );
    default:
      return null;
  }
}
