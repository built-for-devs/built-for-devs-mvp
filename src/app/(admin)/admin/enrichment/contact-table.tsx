"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Search, Trash2, Upload, UserMinus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImportDialog } from "./import-dialog";

type SortOption = "default" | "name-asc" | "name-desc" | "not-enriched-first" | "enriched-first" | "has-linkedin-first";

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

const MAX_BATCH = 50;

const FILTER_PRESETS = [
  { label: "Engineers & Developers", value: "engineer,developer,software" },
  { label: "Leadership", value: "cto,vp of engineering,head of engineering,director of engineering,engineering manager,tech lead,chief technology,chief architect" },
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
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [emailOnly, setEmailOnly] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  const fetchContacts = useCallback(
    async (cursor?: string) => {
      const isMore = !!cursor;
      if (isMore) setLoadingMore(true);
      else setLoading(true);

      try {
        let url = `/api/admin/folk/people?groupId=${groupId}&limit=50`;
        if (cursor) url += `&cursor=${cursor}`;
        if (!emailOnly) url += `&emailOnly=false`;
        if (activeFilter) url += `&titleFilter=${encodeURIComponent(activeFilter)}`;
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
    [groupId, emailOnly, activeFilter]
  );

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function applyPreset(value: string) {
    if (activeFilter === value) {
      setActiveFilter("");
    } else {
      setActiveFilter(value);
    }
  }

  function clearNameSearch() {
    setNameSearch("");
  }

  function clearFilter() {
    setActiveFilter("");
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
      // Select from visible (filtered + sorted) contacts
      const ids = sortedContacts.slice(0, MAX_BATCH).map((c) => c.id);
      setSelected(new Set(ids));
    }
  }

  const selectedContacts = contacts.filter((c) => selected.has(c.id));

  const importableSelected = selectedContacts.filter((c) => c.email);

  const nameFiltered = nameSearch
    ? contacts.filter((c) => {
        const name = (c.fullName ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`).trim().toLowerCase();
        return name.includes(nameSearch.toLowerCase());
      })
    : contacts;

  const sortedContacts = [...nameFiltered].sort((a, b) => {
    const nameA = (a.fullName ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`).trim().toLowerCase();
    const nameB = (b.fullName ?? `${b.firstName ?? ""} ${b.lastName ?? ""}`).trim().toLowerCase();
    const statusOrder = { not_enriched: 0, partial: 1, enriched: 2 };

    switch (sortBy) {
      case "name-asc":
        return nameA.localeCompare(nameB);
      case "name-desc":
        return nameB.localeCompare(nameA);
      case "not-enriched-first":
        return statusOrder[a.enrichmentStatus] - statusOrder[b.enrichmentStatus] || nameA.localeCompare(nameB);
      case "enriched-first":
        return statusOrder[b.enrichmentStatus] - statusOrder[a.enrichmentStatus] || nameA.localeCompare(nameB);
      case "has-linkedin-first":
        return (b.linkedinUrl ? 1 : 0) - (a.linkedinUrl ? 1 : 0) || nameA.localeCompare(nameB);
      default:
        return 0;
    }
  });

  async function removeFromGroup(ids: string[]) {
    setDeleting((prev) => new Set([...prev, ...ids]));
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch("/api/admin/folk/people/remove-from-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: ids, groupId }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(`Remove failed (${res.status}): ${text || "server error"}`);
        return;
      }
      const data = await res.json();
      if (data.removed > 0) {
        setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      }
      if (data.errors?.length) {
        console.error("Remove from group errors:", data.errors);
        setError(`Failed to remove some contacts: ${data.errors.join(", ")}`);
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Request timed out — Folk API may be slow. Try again.");
      } else {
        setError("Failed to remove contacts from group");
      }
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  }

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
          <span className="mx-1 text-muted-foreground">|</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-8 w-[170px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="not-enriched-first">Not Enriched First</SelectItem>
              <SelectItem value="has-linkedin-first">Has LinkedIn First</SelectItem>
              <SelectItem value="enriched-first">Enriched First</SelectItem>
              <SelectItem value="default">Folk Default</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {nameSearch && (
            <button
              onClick={clearNameSearch}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && !loading && (
        <div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">No contacts in this group.</p>
        </div>
      ) : sortedContacts.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">
            No contacts match the current filter.{" "}
            <button onClick={clearFilter} className="text-primary underline">Clear filter</button>
          </p>
        </div>
      ) : (
        <>
          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span>{selected.size}/{MAX_BATCH} selected</span>
              <span className="ml-2">&middot; {sortedContacts.length}{sortedContacts.length !== contacts.length ? ` of ${contacts.length}` : ""} contact{contacts.length !== 1 ? "s" : ""}{sortedContacts.length !== contacts.length ? " matching" : " loaded"}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={importableSelected.length === 0}
                onClick={() => setImportOpen(true)}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Import to BFD ({importableSelected.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={selected.size === 0 || deleting.size > 0}
                onClick={() => removeFromGroup(Array.from(selected))}
              >
                <UserMinus className="mr-1.5 h-4 w-4" />
                Remove from Group ({selected.size})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={selected.size === 0 || deleting.size > 0}
                onClick={() => removeFromFolk(Array.from(selected))}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete from Folk ({selected.size})
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
                {sortedContacts.map((contact) => {
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
                          onClick={() => removeFromGroup([contact.id])}
                          disabled={deleting.has(contact.id)}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                          title="Remove from group"
                        >
                          {deleting.has(contact.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
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

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        contacts={importableSelected}
        folkGroupId={groupId}
      />
    </div>
  );
}
