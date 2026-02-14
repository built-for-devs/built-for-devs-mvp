import type { DeveloperFilters, ProjectFilters, EvaluationFilters, ScoreFilters } from "@/types/admin";

const ITEMS_PER_PAGE = 10;

// Parse comma-separated array from URL param
function parseArray(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value.split(",").filter(Boolean);
}

// Parse integer from URL param
function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return isNaN(n) ? undefined : n;
}

// Parse boolean from URL param
function parseBool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function parseDeveloperFilters(
  searchParams: Record<string, string | string[] | undefined>
): DeveloperFilters {
  const get = (key: string): string | null => {
    const val = searchParams[key];
    if (Array.isArray(val)) return val[0] ?? null;
    return val ?? null;
  };

  return {
    search: get("search") ?? undefined,
    location: get("location") ?? undefined,
    role_types: parseArray(get("role_types")),
    seniority: parseArray(get("seniority")),
    min_experience: parseIntParam(get("min_experience")),
    max_experience: parseIntParam(get("max_experience")),
    languages: parseArray(get("languages")),
    frameworks: parseArray(get("frameworks")),
    databases: parseArray(get("databases")),
    cloud_platforms: parseArray(get("cloud_platforms")),
    devops_tools: parseArray(get("devops_tools")),
    cicd_tools: parseArray(get("cicd_tools")),
    testing_frameworks: parseArray(get("testing_frameworks")),
    api_experience: parseArray(get("api_experience")),
    operating_systems: parseArray(get("operating_systems")),
    industries: parseArray(get("industries")),
    company_size: parseArray(get("company_size")),
    buying_influence: parseArray(get("buying_influence")),
    paid_tools: parseArray(get("paid_tools")),
    open_source_activity: parseArray(get("open_source_activity")),
    is_available: parseBool(get("is_available")),
    has_github: parseBool(get("has_github")),
    has_linkedin: parseBool(get("has_linkedin")),
    sort: get("sort") === "last_enriched_at" ? "last_enriched_at" : undefined,
    page: parseIntParam(get("page")) ?? 1,
    per_page: parseIntParam(get("per_page")) ?? ITEMS_PER_PAGE,
  };
}

export function parseProjectFilters(
  searchParams: Record<string, string | string[] | undefined>
): ProjectFilters {
  const get = (key: string): string | null => {
    const val = searchParams[key];
    if (Array.isArray(val)) return val[0] ?? null;
    return val ?? null;
  };

  return {
    status: (get("status") as ProjectFilters["status"]) ?? undefined,
    search: get("search") ?? undefined,
    page: parseIntParam(get("page")) ?? 1,
    per_page: parseIntParam(get("per_page")) ?? ITEMS_PER_PAGE,
  };
}

export function parseEvaluationFilters(
  searchParams: Record<string, string | string[] | undefined>
): EvaluationFilters {
  const get = (key: string): string | null => {
    const val = searchParams[key];
    if (Array.isArray(val)) return val[0] ?? null;
    return val ?? null;
  };

  return {
    status: (get("status") as EvaluationFilters["status"]) ?? undefined,
    search: get("search") ?? undefined,
    page: parseIntParam(get("page")) ?? 1,
    per_page: parseIntParam(get("per_page")) ?? ITEMS_PER_PAGE,
  };
}

export function parseScoreFilters(
  searchParams: Record<string, string | string[] | undefined>
): ScoreFilters {
  const get = (key: string): string | null => {
    const val = searchParams[key];
    if (Array.isArray(val)) return val[0] ?? null;
    return val ?? null;
  };

  return {
    status: get("status") ?? undefined,
    search: get("search") ?? undefined,
    page: parseIntParam(get("page")) ?? 1,
    per_page: parseIntParam(get("per_page")) ?? ITEMS_PER_PAGE,
  };
}

// Serialize filters to URL search params string
export function serializeDeveloperFilters(filters: DeveloperFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length > 0) {
      params.set(key, value.join(","));
    } else if (typeof value === "boolean") {
      params.set(key, String(value));
    } else if (typeof value === "number") {
      params.set(key, String(value));
    } else if (typeof value === "string" && value) {
      params.set(key, value);
    }
  }
  return params.toString();
}

// Count active filters (excluding pagination)
export function countActiveFilters(filters: DeveloperFilters): number {
  let count = 0;
  const skip = new Set(["page", "per_page", "sort"]);
  for (const [key, value] of Object.entries(filters)) {
    if (skip.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length > 0) count++;
    else if (typeof value === "boolean") count++;
    else if (typeof value === "number") count++;
    else if (typeof value === "string" && value) count++;
  }
  return count;
}
