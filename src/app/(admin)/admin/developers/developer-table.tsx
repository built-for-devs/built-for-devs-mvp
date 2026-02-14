"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Sparkles, Trash2 } from "lucide-react";
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
import { DeveloperRowEditor } from "./developer-row-editor";
import { BulkProjectDialog } from "./bulk-project-dialog";
import { EnrichDialog } from "./enrich-dialog";

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

  // Build a name lookup for the bulk project dialog
  const developerNames: Record<string, string> = {};
  for (const dev of developers) {
    developerNames[dev.id] = dev.profiles.full_name;
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {selected.size} developer{selected.size !== 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
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
              <TableHead>Name</TableHead>
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
