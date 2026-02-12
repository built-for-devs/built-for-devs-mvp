"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importFromFolk } from "@/lib/admin/actions";
import type { FolkImportContact } from "@/lib/admin/actions";

interface ContactView {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  linkedinUrl: string | null;
  jobTitle: string | null;
  company: string | null;
  enrichmentStatus: string;
  enrichmentData: Record<string, string | null>;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactView[];
}

export function ImportDialog({
  open,
  onOpenChange,
  contacts,
}: ImportDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  function handleImport() {
    const mapped: FolkImportContact[] = contacts
      .filter((c) => c.email)
      .map((c) => ({
        email: c.email!,
        full_name:
          c.fullName ??
          (`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
          c.email!),
        job_title: c.jobTitle ?? undefined,
        current_company: c.company ?? undefined,
        linkedin_url: c.linkedinUrl ?? undefined,
        location: c.enrichmentData["Location"] ?? undefined,
        seniority: c.enrichmentData["Seniority level"] ?? undefined,
        years_experience: c.enrichmentData["Years of professional experience"]
          ? parseInt(c.enrichmentData["Years of professional experience"], 10) || undefined
          : undefined,
        languages: c.enrichmentData["Primary programming languages"]
          ? c.enrichmentData["Primary programming languages"].split(",").map((s) => s.trim())
          : undefined,
        role_types: c.enrichmentData["Role type"]
          ? c.enrichmentData["Role type"].split(",").map((s) => s.trim())
          : undefined,
      }));

    startTransition(async () => {
      const res = await importFromFolk(mapped);
      setResult({ imported: res.imported, skipped: res.skipped, errors: res.errors });
    });
  }

  function handleClose() {
    onOpenChange(false);
    if (result && result.imported > 0) {
      router.refresh();
    }
    setResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import to Built for Devs</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import {contacts.length} enriched contact
              {contacts.length !== 1 ? "s" : ""} as developer users in BFD.
              Existing emails will be skipped.
            </p>

            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">
                        {c.fullName ??
                          (`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
                          "—")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.enrichmentData["Location"] ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.enrichmentData["Seniority level"] ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.enrichmentData["Role type"] ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isPending}>
                {isPending ? "Importing..." : `Import ${contacts.length}`}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge className="bg-green-100 text-green-800 border-transparent">
                {result.imported} imported
              </Badge>
              {result.skipped > 0 && (
                <Badge variant="outline">
                  {result.skipped} skipped (already exist)
                </Badge>
              )}
              {result.errors.length > 0 && (
                <Badge className="bg-red-100 text-red-800 border-transparent">
                  {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-auto rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {result.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
