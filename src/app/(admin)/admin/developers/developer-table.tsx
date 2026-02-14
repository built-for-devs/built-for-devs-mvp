"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, EyeOff, FolderPlus, GitMerge, Linkedin, Loader2, Search, Sparkles, Trash2, XCircle } from "lucide-react";
import { deleteDevelopersInBulk } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DeveloperRowEditor } from "./developer-row-editor";
import { BulkProjectDialog } from "./bulk-project-dialog";
import { EnrichDialog } from "./enrich-dialog";
import { LinkedinEnrichDialog } from "./linkedin-enrich-dialog";
import { MergeDialog } from "./merge-dialog";

interface DeveloperRowData {
  id: string;
  job_title: string | null;
  role_types: string[] | null;
  seniority: string | null;
  years_experience: number | null;
  languages: string[] | null;
  current_company: string | null;
  is_available: boolean;
  total_evaluations: number;
  linkedin_url: string | null;
  github_url: string | null;
  last_enriched_at: string | null;
  profiles: { full_name: string; email: string };
}

export function DeveloperTable({ developers }: { developers: DeveloperRowData[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ deleted: number; errors: string[] } | null>(null);
  const [anonymized, setAnonymized] = useState(false);
  const [sixtyfourOpen, setSixtyfourOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [linkedinEnrichOpen, setLinkedinEnrichOpen] = useState(false);
  const [sixtyfourSubmitting, setSixtyfourSubmitting] = useState(false);
  const [sixtyfourResults, setSixtyfourResults] = useState<
    { developerId: string; name: string; status: string; taskId?: string }[] | null
  >(null);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(developers.map((d) => d.id)));
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteDevelopersInBulk(Array.from(selected));
      setResult({ deleted: res.deleted, errors: res.errors });
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleCloseConfirm() {
    setConfirmOpen(false);
    setResult(null);
  }

  async function handleSixtyfourSubmit() {
    setSixtyfourSubmitting(true);
    setSixtyfourOpen(true);
    try {
      const res = await fetch("/api/admin/sixtyfour-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();
      setSixtyfourResults(data.results);
    } catch {
      setSixtyfourResults([]);
    } finally {
      setSixtyfourSubmitting(false);
    }
  }

  function handleCloseSixtyfour() {
    setSixtyfourOpen(false);
    setSixtyfourResults(null);
  }

  // Build name/email lookups for dialogs
  const developerNames: Record<string, string> = {};
  const developerEmails: Record<string, string> = {};
  for (const dev of developers) {
    developerNames[dev.id] = dev.profiles.full_name;
    developerEmails[dev.id] = dev.profiles.email;
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} developer{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            {selected.size === 2 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMergeOpen(true)}
              >
                <GitMerge className="mr-1.5 h-4 w-4" />
                Merge
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEnrichOpen(true)}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Enrich ({selected.size})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLinkedinEnrichOpen(true)}
            >
              <Linkedin className="mr-1.5 h-4 w-4" />
              LinkedIn Enrich ({selected.size})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSixtyfourSubmit}
              disabled={sixtyfourSubmitting}
            >
              <Search className="mr-1.5 h-4 w-4" />
              SixtyFour ({selected.size})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProjectOpen(true)}
            >
              <FolderPlus className="mr-1.5 h-4 w-4" />
              Add to Project ({selected.size})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete ({selected.size})
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground">Anonymize</Label>
          <Switch
            checked={anonymized}
            onCheckedChange={setAnonymized}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size > 0 && selected.size === developers.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              {!anonymized && <TableHead>Name</TableHead>}
              <TableHead className="w-10"></TableHead>
              <TableHead className="max-w-[180px]">Job Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role Types</TableHead>
              <TableHead>Seniority</TableHead>
              <TableHead>Exp</TableHead>
              <TableHead>Languages</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Enriched</TableHead>
              <TableHead className="text-right">Evals</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {developers.map((dev) => (
              <DeveloperRowEditor
                key={dev.id}
                dev={dev}
                selected={selected.has(dev.id)}
                onToggleSelect={() => toggleSelect(dev.id)}
                anonymized={anonymized}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bulk add to project */}
      <BulkProjectDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        developerIds={Array.from(selected)}
        developerNames={developerNames}
        onComplete={() => setSelected(new Set())}
      />

      {/* Enrich dialog (GitHub discovery + AI enrichment) */}
      <EnrichDialog
        open={enrichOpen}
        onOpenChange={setEnrichOpen}
        developerIds={Array.from(selected)}
        developerNames={developerNames}
        onComplete={() => setSelected(new Set())}
      />

      {/* LinkedIn enrich dialog */}
      <LinkedinEnrichDialog
        open={linkedinEnrichOpen}
        onOpenChange={setLinkedinEnrichOpen}
        developerIds={Array.from(selected)}
        developerNames={developerNames}
        onComplete={() => setSelected(new Set())}
      />

      {/* Merge dialog (exactly 2 selected) */}
      {selected.size === 2 && (
        <MergeDialog
          open={mergeOpen}
          onOpenChange={setMergeOpen}
          developerIds={Array.from(selected) as [string, string]}
          developerNames={developerNames}
          developerEmails={developerEmails}
          onComplete={() => setSelected(new Set())}
        />
      )}

      {/* SixtyFour submit dialog */}
      <Dialog open={sixtyfourOpen} onOpenChange={handleCloseSixtyfour}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {sixtyfourSubmitting ? "Submitting to SixtyFour..." : "SixtyFour Submission"}
            </DialogTitle>
          </DialogHeader>

          {sixtyfourSubmitting ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting {selected.size} developer{selected.size !== 1 ? "s" : ""} for deep enrichment...
            </div>
          ) : sixtyfourResults ? (
            <div className="space-y-4">
              {sixtyfourResults.length === 0 ? (
                <p className="text-sm text-destructive">Submission failed. Check console for details.</p>
              ) : (
                <div className="max-h-64 overflow-auto space-y-1.5">
                  {sixtyfourResults.map((r) => (
                    <div
                      key={r.developerId}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>{r.name}</span>
                      <span className="flex items-center gap-1 text-xs">
                        {r.status === "submitted" && (
                          <span className="text-green-700 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Submitted
                          </span>
                        )}
                        {r.status === "no_linkedin" && (
                          <span className="text-amber-600 flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> No LinkedIn
                          </span>
                        )}
                        {r.status === "failed" && (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> Failed
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                SixtyFour tasks take ~5 minutes. Use the &quot;Collect SixtyFour Results&quot; button to check for completed results.
              </p>
              <DialogFooter>
                <Button onClick={handleCloseSixtyfour}>Done</Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm */}
      <Dialog open={confirmOpen} onOpenChange={handleCloseConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selected.size} Developer{selected.size !== 1 ? "s" : ""}?
            </DialogTitle>
          </DialogHeader>

          {!result ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will permanently remove {selected.size} developer
                {selected.size !== 1 ? "s" : ""} and their auth accounts.
                This cannot be undone.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleCloseConfirm}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : `Delete ${selected.size}`}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                {result.deleted} developer{result.deleted !== 1 ? "s" : ""} deleted.
              </p>
              {result.errors.length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                  {result.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button onClick={handleCloseConfirm}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
