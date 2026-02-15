"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatEnumLabel } from "@/lib/admin/filter-options";
import type { IcpCriteria, IcpSuggestResponse } from "@/types/icp";
import { EMPTY_ICP_CRITERIA, ICP_CRITERIA_KEYS } from "@/types/icp";

// Labels for each ICP criteria key
const criteriaLabels: Record<keyof IcpCriteria, string> = {
  role_types: "Role Types",
  seniority: "Seniority",
  languages: "Languages",
  frameworks: "Frameworks",
  databases: "Databases",
  cloud_platforms: "Cloud Platforms",
  devops_tools: "DevOps Tools",
  cicd_tools: "CI/CD Tools",
  testing_frameworks: "Testing Frameworks",
  api_experience: "API Experience",
  operating_systems: "Operating Systems",
  industries: "Industries",
  company_size: "Company Size",
  buying_influence: "Buying Influence",
  paid_tools: "Paid Tools",
  open_source_activity: "Open Source Activity",
};

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

type Phase = "input" | "loading" | "results";

export function IcpWizard() {
  const router = useRouter();

  // Phase management
  const [phase, setPhase] = useState<Phase>("input");

  // Phase 1 — Input
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  // Phase 2 — Loading
  const [loadingMessage, setLoadingMessage] = useState("Analyzing your product...");

  // Phase 3 — Results
  const [criteria, setCriteria] = useState<IcpCriteria>(EMPTY_ICP_CRITERIA);
  const [reasoning, setReasoning] = useState<Record<string, string>>({});
  const [overallReasoning, setOverallReasoning] = useState("");
  const [showAllCriteria, setShowAllCriteria] = useState(false);

  // Developer preview
  const [previewDevs, setPreviewDevs] = useState<AnonymizedDeveloper[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Filter options from feed API
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({});

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Debounce ref for criteria changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialPreview = useRef(true);

  // Fetch filter options on mount
  useEffect(() => {
    fetch("/api/developers/feed/options")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.options) setFilterOptions(data.options);
      })
      .catch(() => {});
  }, []);

  // Priority order for preview filters — only send the top criteria so
  // we don't AND too many categories together and get zero results
  const previewPriority: (keyof IcpCriteria)[] = [
    "role_types", "languages", "seniority", "frameworks",
  ];

  // Fetch developer preview when criteria changes
  const fetchPreview = useCallback(async (currentCriteria: IcpCriteria) => {
    setPreviewLoading(true);

    // Only apply the top 3 populated criteria to keep the preview relaxed
    const populatedPriority = previewPriority.filter(
      (k) => currentCriteria[k].length > 0
    );
    const keysToSend = populatedPriority.slice(0, 3);

    const params = new URLSearchParams();
    params.set("sort", "completeness");

    for (const key of keysToSend) {
      params.set(key, currentCriteria[key].join(","));
    }

    try {
      const res = await fetch(`/api/developers/feed?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const devs = (data.developers ?? []).slice(0, 8);

        if (devs.length > 0) {
          setPreviewDevs(devs);
        } else {
          // Fallback: show top developers by completeness without filters
          const fallbackRes = await fetch("/api/developers/feed?sort=completeness");
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            setPreviewDevs((fallbackData.developers ?? []).slice(0, 8));
          }
        }
      }
    } catch {
      // Non-critical — preview is just a sample
    } finally {
      setPreviewLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced preview refresh on criteria change
  useEffect(() => {
    if (phase !== "results") return;
    // Skip the first render after AI suggestion (it's already fetched)
    if (isInitialPreview.current) {
      isInitialPreview.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPreview(criteria), 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [criteria, phase, fetchPreview]);

  // Handle AI suggestion request
  async function handleSuggest() {
    setError(null);
    setPhase("loading");
    setLoadingMessage("Analyzing your product...");

    // Show timeout message after 15s
    const timeoutId = setTimeout(() => {
      setLoadingMessage("Still working... Claude is thinking deeply about your ICP.");
    }, 15000);

    try {
      const res = await fetch("/api/icp/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || undefined,
          url: url.trim() || undefined,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate suggestions");
      }

      const data: IcpSuggestResponse = await res.json();

      setCriteria(data.criteria);
      setReasoning(data.reasoning);
      setOverallReasoning(data.overallReasoning);
      isInitialPreview.current = true;

      // Fetch initial preview
      await fetchPreview(data.criteria);

      setPhase("results");
    } catch (err) {
      clearTimeout(timeoutId);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhase("input");
    }
  }

  // Update a single criteria field
  function updateCriteria(key: keyof IcpCriteria, values: string[]) {
    setCriteria((prev) => ({ ...prev, [key]: values }));
  }

  // Remove a single value from a criteria field
  function removeValue(key: keyof IcpCriteria, value: string) {
    setCriteria((prev) => ({
      ...prev,
      [key]: prev[key].filter((v) => v !== value),
    }));
  }

  // Navigate to checkout with ICP criteria
  function handleGetEvaluations() {
    localStorage.setItem("bfd_icp_criteria", JSON.stringify(criteria));
    if (url.trim()) {
      localStorage.setItem("bfd_product_url", url.trim());
    }
    if (description.trim()) {
      localStorage.setItem("bfd_product_description", description.trim());
    }
    router.push("/buy");
  }

  // Reset back to input phase
  function handleStartOver() {
    setPhase("input");
    setCriteria(EMPTY_ICP_CRITERIA);
    setReasoning({});
    setOverallReasoning("");
    setPreviewDevs([]);
    setError(null);
  }

  // Determine which criteria are populated vs empty
  const populatedKeys = ICP_CRITERIA_KEYS.filter((k) => criteria[k].length > 0);
  const emptyKeys = ICP_CRITERIA_KEYS.filter((k) => criteria[k].length === 0);
  const hasAnyCriteria = populatedKeys.length > 0;

  const canSubmit = url.trim().length > 0;

  // ===== PHASE 1: INPUT =====
  if (phase === "input") {
    return (
      <div className="mx-auto mt-10 max-w-2xl space-y-6">
        <div className="space-y-2">
          <Label htmlFor="product-url" className="text-base font-medium">
            Product URL
          </Label>
          <Input
            id="product-url"
            type="url"
            placeholder="https://yourproduct.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-base font-medium">
            Describe your product{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="description"
            placeholder="What does your product do and who is it for? e.g. We're building a CLI tool for deploying Kubernetes apps..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button
          size="lg"
          className="w-full text-base"
          onClick={handleSuggest}
          disabled={!canSubmit}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Find my ideal developers
        </Button>
      </div>
    );
  }

  // ===== PHASE 2: LOADING =====
  if (phase === "loading") {
    return (
      <div className="mx-auto mt-10 flex max-w-md flex-col items-center space-y-6 py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-center text-lg text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  // ===== PHASE 3: RESULTS =====
  return (
    <div className="mx-auto mt-10 max-w-4xl space-y-8">
      {/* AI Reasoning */}
      {overallReasoning && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-muted-foreground">{overallReasoning}</p>
          </div>
        </div>
      )}

      {/* Editable Criteria */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Developer criteria</h3>
          <button
            onClick={handleStartOver}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Start over
          </button>
        </div>

        {/* Populated criteria — two-column grid of cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {populatedKeys.map((key) => (
            <div key={key} className="rounded-lg border p-3 space-y-2">
              <div>
                <p className="text-sm font-medium">{criteriaLabels[key]}</p>
                {reasoning[key] && (
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{reasoning[key]}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {criteria[key].map((value) => (
                  <Badge key={value} variant="secondary" className="gap-1 text-xs">
                    {formatEnumLabel(value)}
                    <button
                      onClick={() => removeValue(key, value)}
                      className="hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <MultiSelectFilter
                  label="Add"
                  options={filterOptions[key] ?? []}
                  selected={criteria[key]}
                  onChange={(v) => updateCriteria(key, v)}
                  compact
                />
              </div>
            </div>
          ))}
        </div>

        {/* Empty criteria — expandable section to add more */}
        {emptyKeys.length > 0 && (
          <div>
            <button
              onClick={() => setShowAllCriteria(!showAllCriteria)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showAllCriteria ? "rotate-180" : ""}`}
              />
              {showAllCriteria ? "Hide" : "Add more criteria"} ({emptyKeys.length} available)
            </button>

            {showAllCriteria && (
              <div className="mt-3 flex flex-wrap gap-2">
                {emptyKeys.map((key) => (
                  <MultiSelectFilter
                    key={key}
                    label={criteriaLabels[key]}
                    options={filterOptions[key] ?? []}
                    selected={criteria[key]}
                    onChange={(v) => updateCriteria(key, v)}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Developer Preview */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Matching developers</h3>
        <p className="text-sm text-muted-foreground">
          A preview of developers from our network who match your criteria.
        </p>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-muted/60">
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Title</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seniority</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exp</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Languages</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frameworks</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Country</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div></TableCell>
                    <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-14 rounded-full" /><Skeleton className="h-5 w-12 rounded-full" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : previewDevs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Loading developers from our network...
                  </TableCell>
                </TableRow>
              ) : (
                previewDevs.map((dev, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium whitespace-nowrap">{dev.jobTitle ?? "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{dev.seniority ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dev.experience}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dev.languages.length > 0
                          ? dev.languages.slice(0, 3).map((l) => (
                              <Badge key={l} variant="secondary" className="text-xs font-normal">{l}</Badge>
                            ))
                          : <span className="text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {dev.frameworks.length > 0
                          ? dev.frameworks.slice(0, 3).map((f) => (
                              <Badge key={f} variant="secondary" className="text-xs font-normal">{f}</Badge>
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
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full text-base"
          onClick={handleGetEvaluations}
          disabled={!hasAnyCriteria}
        >
          Get Evaluations ($399/each)
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          We&apos;ll match developers from our network who fit these criteria to evaluate your product.
        </p>
      </div>
    </div>
  );
}
