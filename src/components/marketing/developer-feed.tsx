"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MultiSelectFilter } from "@/components/admin/multi-select-filter";

interface AnonymizedDeveloper {
  jobTitle: string | null;
  roleTypes: string[];
  seniority: string | null;
  experience: string;
  languages: string[];
  frameworks: string[];
  buyingInfluence: string | null;
  paidTools: string[];
  country: string | null;
}

interface Filters {
  role_types: string[];
  seniority: string[];
  languages: string[];
  frameworks: string[];
  country: string[];
  databases: string[];
  cloud_platforms: string[];
  devops_tools: string[];
  cicd_tools: string[];
  testing_frameworks: string[];
  api_experience: string[];
  operating_systems: string[];
  industries: string[];
  company_size: string[];
  buying_influence: string[];
  paid_tools: string[];
  open_source_activity: string[];
}

const filterKeys = [
  "role_types",
  "seniority",
  "languages",
  "frameworks",
  "country",
  "databases",
  "cloud_platforms",
  "devops_tools",
  "cicd_tools",
  "testing_frameworks",
  "api_experience",
  "operating_systems",
  "industries",
  "company_size",
  "buying_influence",
  "paid_tools",
  "open_source_activity",
] as const;

const emptyFilters = Object.fromEntries(
  filterKeys.map((k) => [k, []])
) as unknown as Filters;

const filterLabels: Record<keyof Filters, string> = {
  role_types: "Role Type",
  seniority: "Seniority",
  languages: "Languages",
  frameworks: "Frameworks",
  databases: "Databases",
  cloud_platforms: "Cloud",
  devops_tools: "DevOps",
  cicd_tools: "CI/CD",
  testing_frameworks: "Testing",
  api_experience: "APIs",
  operating_systems: "OS",
  industries: "Industry",
  company_size: "Company Size",
  buying_influence: "Buying Influence",
  paid_tools: "Paid Tools",
  open_source_activity: "Open Source",
  country: "Country",
};

export function DeveloperFeed() {
  const router = useRouter();
  const [developers, setDevelopers] = useState<AnonymizedDeveloper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [options, setOptions] = useState<Record<string, string[]>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const isInitialMount = useRef(true);

  function setFilter(key: keyof Filters, value: string[]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  // Clear selections when filters change
  useEffect(() => {
    setSelected(new Set());
  }, [filters]);

  // Fetch dynamic filter options on mount
  useEffect(() => {
    fetch("/api/developers/feed/options")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.options) setOptions(data.options);
      })
      .catch(() => {});
  }, []);

  const fetchDevelopers = useCallback(async (loadMore = false) => {
    const currentOffset = loadMore ? offset : 0;
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setOffset(0);
    }

    const params = new URLSearchParams();
    params.set("sort", "completeness");
    if (currentOffset > 0) params.set("offset", String(currentOffset));
    for (const [key, values] of Object.entries(filters)) {
      if (values.length) params.set(key, values.join(","));
    }

    try {
      const res = await fetch(`/api/developers/feed?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const newDevs = data.developers ?? [];
        if (loadMore) {
          setDevelopers((prev) => [...prev, ...newDevs]);
        } else {
          setDevelopers(newDevs);
        }
        setHasMore(data.hasMore ?? false);
        setOffset(currentOffset + newDevs.length);
      }
    } catch {
      // Silently fail — feed is non-critical marketing
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, offset]);

  // Fetch on mount
  useEffect(() => {
    fetchDevelopers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced re-fetch when filters/sort change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timeout = setTimeout(() => fetchDevelopers(false), 300);
    return () => clearTimeout(timeout);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters = Object.values(filters).some((arr) => arr.length > 0);

  function clearFilters() {
    setFilters(emptyFilters);
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === developers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(developers.map((_, i) => i)));
    }
  }

  function handleGetEvaluations() {
    const profiles = developers
      .filter((_, i) => selected.has(i))
      .map((dev) => ({
        jobTitle: dev.jobTitle,
        roleTypes: dev.roleTypes,
        seniority: dev.seniority,
        languages: dev.languages,
        frameworks: dev.frameworks,
        buyingInfluence: dev.buyingInfluence,
        paidTools: dev.paidTools,
        country: dev.country,
      }));
    localStorage.setItem("bfd_selected_profiles", JSON.stringify(profiles));
    router.push("/buy");
  }

  const allSelected =
    developers.length > 0 && selected.size === developers.length;

  return (
    <div className="mt-10 space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {filterKeys.map((key) => {
          const opts = options[key];
          if (!opts || opts.length === 0) return null;
          return (
            <MultiSelectFilter
              key={key}
              label={filterLabels[key]}
              options={opts}
              selected={filters[key]}
              onChange={(v) => setFilter(key, v)}
              compact
            />
          );
        })}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs text-muted-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Developer table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-muted/60">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all developers"
                />
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Title</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seniority</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exp</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frameworks</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buying Influence</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paid Tools</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div></TableCell>
                  <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-5 w-10 rounded-full" /></div></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : developers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                  No developers match these filters.
                  {hasFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="ml-3"
                    >
                      Reset filters
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              developers.map((dev, i) => (
                <TableRow
                  key={i}
                  className={selected.has(i) ? "bg-muted/50" : "cursor-pointer"}
                  onClick={() => toggleSelect(i)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(i)}
                      onCheckedChange={() => toggleSelect(i)}
                      aria-label={`Select ${dev.jobTitle ?? "developer"}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{dev.jobTitle ?? "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{dev.seniority ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{dev.experience}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {dev.languages.length > 0
                        ? dev.languages.map((l) => (
                            <Badge key={l} variant="secondary" className="text-xs font-normal">{l}</Badge>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {dev.frameworks.length > 0
                        ? dev.frameworks.map((f) => (
                            <Badge key={f} variant="secondary" className="text-xs font-normal">{f}</Badge>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{dev.buyingInfluence ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {dev.paidTools.length > 0
                        ? dev.paidTools.slice(0, 4).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs font-normal">{t}</Badge>
                          ))
                        : <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{dev.country ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchDevelopers(true)}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading..." : "Load more developers"}
          </Button>
        </div>
      )}

      {/* Floating selection bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selected.size} developer{selected.size !== 1 ? "s" : ""} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
            <Button onClick={handleGetEvaluations}>
              Get Evaluations ($399/each)
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
