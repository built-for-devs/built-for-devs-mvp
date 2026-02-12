"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface EnrichContact {
  folkId: string;
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  jobTitle?: string | null;
  company?: string | null;
}

interface EnrichResult {
  folkId: string;
  name: string;
  status: "enriched" | "partial" | "failed";
  data?: {
    seniority: string | null;
    roleType: string | null;
    languages: string | null;
    yearsExperience: string | null;
    location: string | null;
  };
  error?: string;
}

interface EnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: EnrichContact[];
  groupId: string;
  onComplete: () => void;
}

export function EnrichDialog({
  open,
  onOpenChange,
  contacts,
  groupId,
  onComplete,
}: EnrichDialogProps) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<EnrichResult[] | null>(null);

  async function handleEnrich() {
    setRunning(true);
    setResults(null);

    try {
      const res = await fetch("/api/admin/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: contacts.map((c) => ({
            folkId: c.folkId,
            name: c.name,
            email: c.email,
            linkedinUrl: c.linkedinUrl,
            jobTitle: c.jobTitle,
            company: c.company,
          })),
          groupId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Enrichment failed");
      }

      const data = await res.json();
      setResults(data.results);
    } catch (err) {
      setResults(
        contacts.map((c) => ({
          folkId: c.folkId,
          name: c.name,
          status: "failed" as const,
          error: err instanceof Error ? err.message : "Unknown error",
        }))
      );
    } finally {
      setRunning(false);
    }
  }

  function handleClose() {
    onOpenChange(false);
    if (results?.some((r) => r.status !== "failed")) {
      onComplete();
    }
    setResults(null);
  }

  const enrichedCount = results?.filter((r) => r.status === "enriched").length ?? 0;
  const partialCount = results?.filter((r) => r.status === "partial").length ?? 0;
  const failedCount = results?.filter((r) => r.status === "failed").length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Enrich {contacts.length} Contact{contacts.length !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will search the web for each contact and use AI to extract
              developer profile data (seniority, role, languages, experience, location).
              Results are saved to Folk automatically.
            </p>

            <div className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-sm">
              {contacts.map((c, i) => (
                <div key={c.folkId} className="flex justify-between py-0.5">
                  <span>{i + 1}. {c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.company ?? c.jobTitle ?? ""}
                  </span>
                </div>
              ))}
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={handleClose} disabled={running}>
                Cancel
              </Button>
              <Button onClick={handleEnrich} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Enriching...
                  </>
                ) : (
                  `Enrich ${contacts.length} Contact${contacts.length !== 1 ? "s" : ""}`
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-3 text-sm">
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

            {/* Results */}
            <div className="max-h-64 overflow-auto space-y-2">
              {results.map((r) => (
                <div
                  key={r.folkId}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.name}</span>
                    {r.status === "enriched" && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {r.status === "partial" && (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    {r.status === "failed" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {r.data && (
                    <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {r.data.location && <span>Location: {r.data.location}</span>}
                      {r.data.seniority && <span>Seniority: {r.data.seniority}</span>}
                      {r.data.roleType && <span>Role: {r.data.roleType}</span>}
                      {r.data.yearsExperience && <span>YOE: {r.data.yearsExperience}</span>}
                      {r.data.languages && (
                        <span className="col-span-2">Languages: {r.data.languages}</span>
                      )}
                    </div>
                  )}
                  {r.error && (
                    <p className="mt-1 text-xs text-red-600">{r.error}</p>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="sm:justify-start">
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
