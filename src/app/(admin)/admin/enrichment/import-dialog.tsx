"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Upload,
  Sparkles,
  Clock,
  Github,
} from "lucide-react";
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

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

type Phase = "confirm" | "importing" | "discovering" | "enriching" | "complete";

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

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactView[];
  folkGroupId: string;
}

export function ImportDialog({
  open,
  onOpenChange,
  contacts,
  folkGroupId,
}: ImportDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("confirm");
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
    developerIds: string[];
  } | null>(null);
  const [developerNames, setDeveloperNames] = useState<Record<string, string>>({});
  const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([]);
  const [enrichItems, setEnrichItems] = useState<EnrichItem[]>([]);

  function handleClose() {
    onOpenChange(false);
    if (phase === "complete" || phase === "enriching" || phase === "discovering") {
      router.refresh();
    }
    setTimeout(() => {
      setPhase("confirm");
      setImportResult(null);
      setDeveloperNames({});
      setDiscoveryItems([]);
      setEnrichItems([]);
    }, 200);
  }

  function contactName(c: ContactView): string {
    return c.fullName ?? (`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email!);
  }

  // ── Phase 1: Import ──

  async function startImport() {
    setPhase("importing");

    const mapped: FolkImportContact[] = contacts
      .filter((c) => c.email)
      .map((c) => ({
        folk_person_id: c.id,
        folk_group_id: folkGroupId,
        email: c.email!,
        full_name: contactName(c),
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

    try {
      const res = await importFromFolk(mapped);
      setImportResult(res);

      if (res.developerIds.length > 0) {
        const names = res.developerNames;
        setDeveloperNames(names);
        startDiscovery(res.developerIds, names);
      } else {
        setPhase("complete");
      }
    } catch {
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: ["Import failed unexpectedly"],
        developerIds: [],
      });
      setPhase("complete");
    }
  }

  // ── Phase 2: GitHub Discovery (batched in chunks of 10) ──

  async function startDiscovery(devIds: string[], names: Record<string, string>) {
    setPhase("discovering");
    setDiscoveryItems(
      devIds.map((id) => ({
        developerId: id,
        name: names[id] ?? "Unknown",
        status: "searching",
      }))
    );

    const allItems: DiscoveryItem[] = [];
    const chunks = chunkArray(devIds, 10);

    for (const chunk of chunks) {
      try {
        const res = await fetch("/api/admin/github-discovery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ developerIds: chunk }),
        });

        if (!res.ok) throw new Error("Discovery request failed");
        const data = await res.json();

        const items: DiscoveryItem[] = data.results.map((r: DiscoveryItem) => ({
          developerId: r.developerId,
          name: r.name,
          status: r.status === "submitted" ? "submitted" : r.status,
          githubUrl: r.githubUrl,
          taskId: r.taskId,
          source: r.source,
        }));

        allItems.push(...items);
        // Update UI progressively as each batch completes
        const completedIds = new Set(allItems.map((i) => i.developerId));
        setDiscoveryItems(
          allItems.concat(
            devIds
              .filter((id) => !completedIds.has(id))
              .map((id) => ({ developerId: id, name: names[id] ?? "Unknown", status: "searching" as const }))
          )
        );
      } catch {
        // Mark this chunk as failed, continue with remaining chunks
        for (const id of chunk) {
          allItems.push({ developerId: id, name: names[id] ?? "Unknown", status: "failed" });
        }
      }
    }

    setDiscoveryItems(allItems);
    // Don't poll SixtyFour — proceed to enrichment immediately.
    // SixtyFour results are collected later via "Collect Results" on Developers page.
    startEnrichment(devIds, names);
  }

  // ── Phase 3: Enrichment (batched in chunks of 10) ──

  async function startEnrichment(devIds: string[], names: Record<string, string>) {
    setPhase("enriching");
    setEnrichItems(
      devIds.map((id) => ({
        developerId: id,
        name: names[id] ?? "Unknown",
        status: "enriched" as const,
      }))
    );

    const allItems: EnrichItem[] = [];
    const chunks = chunkArray(devIds, 10);

    for (const chunk of chunks) {
      try {
        const res = await fetch("/api/admin/re-enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ developerIds: chunk }),
        });

        if (!res.ok) throw new Error("Enrichment failed");
        const data = await res.json();

        const items: EnrichItem[] = data.results.map(
          (r: { id: string; name: string; status: string; data?: Record<string, unknown> }) => ({
            developerId: r.id,
            name: r.name,
            status: r.status === "failed" ? "failed" : r.status === "partial" ? "partial" : "enriched",
            fieldsUpdated: r.data ? Object.keys(r.data).filter((k) => r.data![k] != null).length : 0,
          })
        );

        allItems.push(...items);
        // Update UI progressively
        const completedIds = new Set(allItems.map((i) => i.developerId));
        setEnrichItems(
          allItems.concat(
            devIds
              .filter((id) => !completedIds.has(id))
              .map((id) => ({ developerId: id, name: names[id] ?? "Unknown", status: "enriched" as const }))
          )
        );
      } catch {
        for (const id of chunk) {
          allItems.push({ developerId: id, name: names[id] ?? "Unknown", status: "failed" });
        }
      }
    }

    setEnrichItems(allItems);
    setPhase("complete");
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
            {phase === "confirm" && `Import & Enrich ${contacts.length} Contact${contacts.length !== 1 ? "s" : ""}`}
            {phase === "importing" && "Importing Contacts..."}
            {phase === "discovering" && "Finding GitHub Profiles..."}
            {phase === "enriching" && "Enriching Profiles..."}
            {phase === "complete" && "Import Complete"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Confirm Phase ── */}
        {phase === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will import {contacts.length} contact{contacts.length !== 1 ? "s" : ""} as
              developers, find their GitHub profiles, and enrich with AI.
            </p>

            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm font-medium">
                        {contactName(c)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.company ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={startImport}>
                <Upload className="mr-1.5 h-4 w-4" />
                Import & Enrich
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── Importing Phase ── */}
        {phase === "importing" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Step 1/3: Creating developer accounts...
            </div>

            <div className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-sm">
              {contacts.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 py-0.5">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  {i + 1}. {contactName(c)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Discovery Phase ── */}
        {phase === "discovering" && (
          <div className="space-y-4">
            {importResult && importResult.imported > 0 && (
              <div className="flex gap-2 text-sm">
                <Badge className="bg-green-100 text-green-800 border-transparent">
                  {importResult.imported} imported
                </Badge>
                {importResult.skipped > 0 && (
                  <Badge variant="outline">{importResult.skipped} skipped</Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Step 2/3: Finding GitHub profiles...
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
              Step 3/3: Enriching profiles with GitHub + AI...
            </div>

            <div className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-sm">
              {enrichItems.map((item, i) => (
                <div key={item.developerId} className="flex items-center gap-2 py-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                  {i + 1}. {item.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Complete Phase ── */}
        {phase === "complete" && (
          <div className="space-y-4">
            {/* Import summary */}
            {importResult && (
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="flex items-center gap-1 font-medium">
                  <Upload className="h-4 w-4" /> Import:
                </span>
                {importResult.imported > 0 && (
                  <Badge className="bg-green-100 text-green-800 border-transparent">
                    {importResult.imported} imported
                  </Badge>
                )}
                {importResult.skipped > 0 && (
                  <Badge variant="outline">{importResult.skipped} skipped</Badge>
                )}
                {importResult.errors.length > 0 && (
                  <Badge className="bg-red-100 text-red-800 border-transparent">
                    {importResult.errors.length} error{importResult.errors.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            )}

            {importResult?.errors && importResult.errors.length > 0 && (
              <div className="max-h-24 overflow-auto rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {importResult.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}

            {/* GitHub discovery summary */}
            {discoveryItems.length > 0 && (
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1 font-medium">
                  <Github className="h-4 w-4" /> GitHub:
                </span>
                {discoveryFound > 0 && (
                  <span className="text-green-700">{discoveryFound} found</span>
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
            )}

            {/* Enrichment summary */}
            {enrichItems.length > 0 && (
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
            )}

            {/* Per-developer results */}
            {enrichItems.length > 0 && (
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
