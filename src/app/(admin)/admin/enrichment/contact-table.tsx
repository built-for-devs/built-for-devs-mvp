"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FolderPlus, Loader2, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnrichDialog } from "./enrich-dialog";
import { ImportDialog } from "./import-dialog";

interface FolkContactView {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  linkedinUrl: string | null;
  jobTitle: string | null;
  company: string | null;
  enrichmentStatus: "enriched" | "partial" | "not_enriched";
  enrichmentData: Record<string, string | null>;
}

const MAX_BATCH = 10;

const FILTER_PRESETS = [
  { label: "Engineers & Developers", value: "engineer,developer,software" },
  { label: "DevOps & SRE", value: "devops,sre,infrastructure,platform" },
  { label: "Data & ML", value: "data,machine learning,ml,ai,scientist" },
  { label: "Mobile", value: "mobile,ios,android" },
] as const;

const statusBadge: Record<
  string,
  { label: string; className: string }
> = {
  enriched: {
    label: "Enriched",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-transparent",
  },
  partial: {
    label: "Partial",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-transparent",
  },
  not_enriched: {
    label: "Not Enriched",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-transparent",
  },
};

export function ContactTable({ groupId }: { groupId: string }) {
  const [contacts, setContacts] = useState<FolkContactView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [emailOnly, setEmailOnly] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [customInput, setCustomInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchContacts = useCallback(
    async (cursor?: string) => {
      const isMore = !!cursor;
      if (isMore) setLoadingMore(true);
      else setLoading(true);

      try {
        let url = `/api/admin/folk/people?groupId=${groupId}&limit=10`;
        if (cursor) url += `&cursor=${cursor}`;
        if (activeFilter) url += `&titleFilter=${encodeURIComponent(activeFilter)}`;
        if (!emailOnly) url += `&emailOnly=false`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();

        if (isMore) {
          setContacts((prev) => [...prev, ...data.contacts]);
        } else {
          setContacts(data.contacts);
          setSelected(new Set());
        }
        setNextCursor(data.nextCursor);
        setError(null);
      } catch {
        setError("Failed to load contacts from Folk");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [groupId, activeFilter, emailOnly]
  );

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function applyPreset(value: string) {
    if (activeFilter === value) {
      setActiveFilter("");
      setCustomInput("");
    } else {
      setActiveFilter(value);
      setCustomInput("");
    }
  }

  function applyCustomFilter(input: string) {
    setCustomInput(input);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setActiveFilter(input);
    }, 500);
  }

  function clearFilter() {
    setActiveFilter("");
    setCustomInput("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_BATCH) {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size > 0) {
      setSelected(new Set());
    } else {
      const ids = contacts.slice(0, MAX_BATCH).map((c) => c.id);
      setSelected(new Set(ids));
    }
  }

  const selectedContacts = contacts.filter((c) => selected.has(c.id));

  const enrichContacts = selectedContacts.map((c) => ({
    folkId: c.id,
    name: c.fullName ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
    email: c.email,
    linkedinUrl: c.linkedinUrl,
    jobTitle: c.jobTitle,
    company: c.company,
  }));

  const enrichedSelected = selectedContacts.filter(
    (c) => c.enrichmentStatus === "enriched"
  );

  async function removeFromFolk(ids: string[]) {
    setDeleting((prev) => new Set([...prev, ...ids]));
    for (const id of ids) {
      try {
        const res = await fetch(`/api/admin/folk/people/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setContacts((prev) => prev.filter((c) => c.id !== id));
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      } catch {
        // silently skip failures
      }
    }
    setDeleting((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  async function addToFolkGroup(ids: string[]) {
    setAddingToGroup(true);
    try {
      const res = await fetch("/api/admin/folk/people/add-to-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personIds: ids,
          groupName: "NEEDS ENRICHMENT",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Failed to add to group");
        return;
      }
      const data = await res.json();
      if (data.errors?.length) {
        alert(`Added ${data.added}, but ${data.errors.length} failed.`);
      }
      // Remove from current view since they've been queued
      setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    } catch {
      alert("Failed to add contacts to group");
    } finally {
      setAddingToGroup(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              size="sm"
              variant={activeFilter === preset.value ? "default" : "outline"}
              onClick={() => applyPreset(preset.value)}
            >
              {preset.label}
            </Button>
          ))}
          <span className="mx-1 text-muted-foreground">|</span>
          <Button
            size="sm"
            variant={emailOnly ? "default" : "outline"}
            onClick={() => setEmailOnly(!emailOnly)}
          >
            {emailOnly ? "Has Email" : "All Contacts"}
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Custom filter (e.g. architect, lead)"
            value={customInput}
            onChange={(e) => applyCustomFilter(e.target.value)}
            className="pl-9 pr-9"
          />
          {(activeFilter || customInput) && (
            <button
              onClick={clearFilter}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {activeFilter && (
          <p className="text-xs text-muted-foreground">
            Filtering job titles by: <span className="font-medium">{activeFilter}</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">
            {activeFilter
              ? "No contacts match this filter."
              : "No contacts in this group."}
          </p>
        </div>
      ) : (
        <>
          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span>{selected.size}/{MAX_BATCH} selected</span>
              <span className="ml-2">&middot; {contacts.length} contact{contacts.length !== 1 ? "s" : ""} loaded</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setEnrichOpen(true)}
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Enrich ({selected.size})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={enrichedSelected.length === 0}
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Import to BFD ({enrichedSelected.length})
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={selected.size === 0 || addingToGroup}
                onClick={() => addToFolkGroup(Array.from(selected))}
              >
                {addingToGroup ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FolderPlus className="mr-1.5 h-4 w-4" />
                )}
                Needs Enrichment ({selected.size})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={selected.size === 0 || deleting.size > 0}
                onClick={() => removeFromFolk(Array.from(selected))}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remove from Folk ({selected.size})
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>LinkedIn</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => {
                  const badge = statusBadge[contact.enrichmentStatus];
                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                          disabled={
                            !selected.has(contact.id) &&
                            selected.size >= MAX_BATCH
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {contact.fullName ??
                          (`${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() ||
                          "—")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contact.email ?? "—"}
                      </TableCell>
                      <TableCell>
                        {contact.linkedinUrl ? (
                          <a
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            Profile
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contact.jobTitle ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {contact.company ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badge.className}>
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => removeFromFolk([contact.id])}
                          disabled={deleting.has(contact.id)}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                          title="Remove from Folk"
                        >
                          {deleting.has(contact.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Load more */}
          {nextCursor && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => fetchContacts(nextCursor)}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      <EnrichDialog
        open={enrichOpen}
        onOpenChange={setEnrichOpen}
        contacts={enrichContacts}
        groupId={groupId}
        onComplete={() => fetchContacts()}
      />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        contacts={selectedContacts.filter(
          (c) => c.enrichmentStatus === "enriched"
        )}
      />
    </div>
  );
}
