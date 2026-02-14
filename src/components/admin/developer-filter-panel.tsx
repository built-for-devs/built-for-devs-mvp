"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelectFilter } from "./multi-select-filter";
import { countActiveFilters, parseDeveloperFilters } from "@/lib/admin/search-params";
import {
  roleTypeOptions,
  seniorityOptions,
  languageOptions,
  frameworkOptions,
  databaseOptions,
  cloudPlatformOptions,
  devopsToolOptions,
  cicdToolOptions,
  testingFrameworkOptions,
  apiExperienceOptions,
  operatingSystemOptions,
  industryOptions,
  companySizeOptions,
  buyingInfluenceOptions,
  paidToolOptions,
  ossActivityOptions,
} from "@/lib/admin/filter-options";

export function DeveloperFilterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseDeveloperFilters(
    Object.fromEntries(searchParams.entries())
  );
  const activeCount = countActiveFilters(filters);

  function updateParam(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function updateArrayParam(key: string, values: string[]) {
    updateParam(key, values.length > 0 ? values.join(",") : undefined);
  }

  function clearAll() {
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Sort order */}
      <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
        <Label className="text-xs whitespace-nowrap">Sort:</Label>
        <select
          value={filters.sort ?? "created_at"}
          onChange={(e) =>
            updateParam("sort", e.target.value === "created_at" ? undefined : e.target.value)
          }
          className="h-6 rounded border-0 bg-transparent text-xs focus:ring-0"
        >
          <option value="created_at">Newest</option>
          <option value="last_enriched_at">Needs Enrichment</option>
        </select>
      </div>

      {/* Availability toggle */}
      <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
        <Label className="text-xs whitespace-nowrap">Available only</Label>
        <Switch
          checked={filters.is_available === true}
          onCheckedChange={(checked) =>
            updateParam("is_available", checked ? "true" : undefined)
          }
        />
      </div>

      {/* GitHub filter — 3 states: all / has / missing */}
      <div className="flex items-center gap-1 rounded-md border px-3 py-1.5">
        <Label className="text-xs whitespace-nowrap">GitHub:</Label>
        <div className="flex gap-0.5">
          <Button
            size="sm"
            variant={filters.has_github === undefined ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => updateParam("has_github", undefined)}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filters.has_github === true ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => updateParam("has_github", "true")}
          >
            Has
          </Button>
          <Button
            size="sm"
            variant={filters.has_github === false ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => updateParam("has_github", "false")}
          >
            Missing
          </Button>
        </div>
      </div>

      {/* LinkedIn filter — 3 states: all / has / missing */}
      <div className="flex items-center gap-1 rounded-md border px-3 py-1.5">
        <Label className="text-xs whitespace-nowrap">LinkedIn:</Label>
        <div className="flex gap-0.5">
          <Button
            size="sm"
            variant={filters.has_linkedin === undefined ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => updateParam("has_linkedin", undefined)}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filters.has_linkedin === true ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => updateParam("has_linkedin", "true")}
          >
            Has
          </Button>
          <Button
            size="sm"
            variant={filters.has_linkedin === false ? "default" : "ghost"}
            className="h-6 px-2 text-xs"
            onClick={() => updateParam("has_linkedin", "false")}
          >
            Missing
          </Button>
        </div>
      </div>

      {/* Experience range */}
      <div className="flex items-center gap-1 rounded-md border px-3 py-1.5">
        <Label className="text-xs whitespace-nowrap">Exp:</Label>
        <Input
          type="number"
          placeholder="Min"
          value={filters.min_experience ?? ""}
          onChange={(e) =>
            updateParam("min_experience", e.target.value || undefined)
          }
          className="h-6 w-16 text-xs"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="number"
          placeholder="Max"
          value={filters.max_experience ?? ""}
          onChange={(e) =>
            updateParam("max_experience", e.target.value || undefined)
          }
          className="h-6 w-16 text-xs"
        />
      </div>

      {/* Location filter */}
      <div className="flex items-center gap-1 rounded-md border px-3 py-1.5">
        <Label className="text-xs whitespace-nowrap">Location:</Label>
        <Input
          type="text"
          placeholder="City, state, or country"
          value={filters.location ?? ""}
          onChange={(e) =>
            updateParam("location", e.target.value || undefined)
          }
          className="h-6 w-40 text-xs"
        />
      </div>

      {/* Multi-select filters */}
      <MultiSelectFilter
        label="Role Types"
        options={roleTypeOptions}
        selected={filters.role_types ?? []}
        onChange={(v) => updateArrayParam("role_types", v)}
        compact
      />
      <MultiSelectFilter
        label="Seniority"
        options={seniorityOptions}
        selected={filters.seniority ?? []}
        onChange={(v) => updateArrayParam("seniority", v)}
        compact
      />
      <MultiSelectFilter
        label="Languages"
        options={languageOptions}
        selected={filters.languages ?? []}
        onChange={(v) => updateArrayParam("languages", v)}
        compact
      />
      <MultiSelectFilter
        label="Frameworks"
        options={frameworkOptions}
        selected={filters.frameworks ?? []}
        onChange={(v) => updateArrayParam("frameworks", v)}
        compact
      />
      <MultiSelectFilter
        label="Databases"
        options={databaseOptions}
        selected={filters.databases ?? []}
        onChange={(v) => updateArrayParam("databases", v)}
        compact
      />
      <MultiSelectFilter
        label="Cloud"
        options={cloudPlatformOptions}
        selected={filters.cloud_platforms ?? []}
        onChange={(v) => updateArrayParam("cloud_platforms", v)}
        compact
      />
      <MultiSelectFilter
        label="DevOps"
        options={devopsToolOptions}
        selected={filters.devops_tools ?? []}
        onChange={(v) => updateArrayParam("devops_tools", v)}
        compact
      />
      <MultiSelectFilter
        label="CI/CD"
        options={cicdToolOptions}
        selected={filters.cicd_tools ?? []}
        onChange={(v) => updateArrayParam("cicd_tools", v)}
        compact
      />
      <MultiSelectFilter
        label="Testing"
        options={testingFrameworkOptions}
        selected={filters.testing_frameworks ?? []}
        onChange={(v) => updateArrayParam("testing_frameworks", v)}
        compact
      />
      <MultiSelectFilter
        label="API"
        options={apiExperienceOptions}
        selected={filters.api_experience ?? []}
        onChange={(v) => updateArrayParam("api_experience", v)}
        compact
      />
      <MultiSelectFilter
        label="OS"
        options={operatingSystemOptions}
        selected={filters.operating_systems ?? []}
        onChange={(v) => updateArrayParam("operating_systems", v)}
        compact
      />
      <MultiSelectFilter
        label="Industries"
        options={industryOptions}
        selected={filters.industries ?? []}
        onChange={(v) => updateArrayParam("industries", v)}
        compact
      />
      <MultiSelectFilter
        label="Co. Size"
        options={companySizeOptions}
        selected={filters.company_size ?? []}
        onChange={(v) => updateArrayParam("company_size", v)}
        compact
      />
      <MultiSelectFilter
        label="Buying Infl."
        options={buyingInfluenceOptions}
        selected={filters.buying_influence ?? []}
        onChange={(v) => updateArrayParam("buying_influence", v)}
        compact
      />
      <MultiSelectFilter
        label="Paid Tools"
        options={paidToolOptions}
        selected={filters.paid_tools ?? []}
        onChange={(v) => updateArrayParam("paid_tools", v)}
        compact
      />
      <MultiSelectFilter
        label="Open Source"
        options={ossActivityOptions}
        selected={filters.open_source_activity ?? []}
        onChange={(v) => updateArrayParam("open_source_activity", v)}
        compact
      />

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
          Clear all
          <Badge variant="secondary" className="ml-1">
            {activeCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
