"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CollectResult {
  developerId: string;
  name: string;
  status: "found" | "pending" | "not_found" | "failed";
  githubUrl?: string;
  fieldsFound?: string[];
}

export function CollectSixtyFourButton({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const [collecting, setCollecting] = useState(false);
  const [results, setResults] = useState<CollectResult[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleCollect() {
    setCollecting(true);
    setDialogOpen(true);

    try {
      const res = await fetch("/api/admin/sixtyfour-collect", { method: "POST" });
      if (!res.ok) throw new Error("Collection failed");
      const data = await res.json();
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setCollecting(false);
    }
  }

  function handleClose() {
    setDialogOpen(false);
    if (results) {
      router.refresh();
      setResults(null);
    }
  }

  if (pendingCount === 0) return null;

  const found = results?.filter((r) => r.status === "found").length ?? 0;
  const stillPending = results?.filter((r) => r.status === "pending").length ?? 0;
  const notFound = results?.filter((r) => r.status === "not_found" || r.status === "failed").length ?? 0;

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleCollect} disabled={collecting}>
        <Clock className="mr-2 h-4 w-4" />
        Collect SixtyFour Results ({pendingCount})
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {collecting ? "Collecting Results..." : "Collection Complete"}
            </DialogTitle>
          </DialogHeader>

          {collecting ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking {pendingCount} pending SixtyFour task{pendingCount !== 1 ? "s" : ""}...
            </div>
          ) : results ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm">
                {found > 0 && (
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle className="h-4 w-4" /> {found} GitHub found
                  </span>
                )}
                {stillPending > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Clock className="h-4 w-4" /> {stillPending} still pending
                  </span>
                )}
                {notFound > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <XCircle className="h-4 w-4" /> {notFound} not found
                  </span>
                )}
              </div>

              {results.length > 0 && (
                <div className="max-h-64 overflow-auto space-y-1.5">
                  {results.map((r) => (
                    <div
                      key={r.developerId}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{r.name}</span>
                      <span className="flex items-center gap-1 text-xs">
                        {r.status === "found" && (
                          <span className="text-green-700">
                            {r.fieldsFound?.join(", ")}
                          </span>
                        )}
                        {r.status === "pending" && (
                          <span className="text-amber-600">Still processing</span>
                        )}
                        {r.status === "not_found" && (
                          <span className="text-muted-foreground">No GitHub found</span>
                        )}
                        {r.status === "failed" && (
                          <span className="text-red-600">Failed</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {stillPending > 0 && (
                <p className="text-xs text-muted-foreground">
                  Try again in a few minutes for the remaining tasks.
                </p>
              )}

              <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
