import type { Project, DeveloperWithProfile } from "@/types/admin";

// ── Types ──────────────────────────────────────────────────────

export interface MatchDetail {
  category: string;
  label: string;
  matched: string[];
  total: number;
  weight: number;
  earned: number;
}

export interface DeveloperMatch {
  developer: DeveloperWithProfile;
  score: number; // 0–100
  matchDetails: MatchDetail[];
}

// ── Weight definitions ─────────────────────────────────────────

interface CriterionDef {
  icpField: keyof Project;
  devField: keyof DeveloperWithProfile;
  label: string;
  weight: number;
  type: "array" | "enum" | "experience";
}

const CRITERIA: CriterionDef[] = [
  // Core (60)
  { icpField: "icp_role_types", devField: "role_types", label: "Role Types", weight: 20, type: "array" },
  { icpField: "icp_seniority_levels", devField: "seniority", label: "Seniority", weight: 15, type: "enum" },
  { icpField: "icp_languages", devField: "languages", label: "Languages", weight: 15, type: "array" },
  { icpField: "icp_min_experience", devField: "years_experience", label: "Experience", weight: 10, type: "experience" },
  // Secondary (25)
  { icpField: "icp_frameworks", devField: "frameworks", label: "Frameworks", weight: 8, type: "array" },
  { icpField: "icp_industries", devField: "industries", label: "Industries", weight: 6, type: "array" },
  { icpField: "icp_databases", devField: "databases", label: "Databases", weight: 5, type: "array" },
  { icpField: "icp_cloud_platforms", devField: "cloud_platforms", label: "Cloud Platforms", weight: 3, type: "array" },
  { icpField: "icp_buying_influence", devField: "buying_influence", label: "Buying Influence", weight: 3, type: "enum" },
  // Peripheral (15)
  { icpField: "icp_company_size_range", devField: "company_size", label: "Company Size", weight: 2, type: "enum" },
  { icpField: "icp_devops_tools", devField: "devops_tools", label: "DevOps Tools", weight: 2, type: "array" },
  { icpField: "icp_cicd_tools", devField: "cicd_tools", label: "CI/CD Tools", weight: 2, type: "array" },
  { icpField: "icp_testing_frameworks", devField: "testing_frameworks", label: "Testing", weight: 2, type: "array" },
  { icpField: "icp_api_experience", devField: "api_experience", label: "API Experience", weight: 2, type: "array" },
  { icpField: "icp_operating_systems", devField: "operating_systems", label: "OS", weight: 1, type: "array" },
  { icpField: "icp_paid_tools", devField: "paid_tools", label: "Paid Tools", weight: 2, type: "array" },
  { icpField: "icp_open_source_activity", devField: "open_source_activity", label: "Open Source", weight: 2, type: "enum" },
];

// ── Helpers ────────────────────────────────────────────────────

function getArray(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  return [];
}

function getString(val: unknown): string | null {
  if (typeof val === "string") return val;
  return null;
}

function getNumber(val: unknown): number | null {
  if (typeof val === "number") return val;
  return null;
}

function arrayOverlap(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((v) => setB.has(v.toLowerCase()));
}

// ── Scoring ────────────────────────────────────────────────────

function scoreDeveloper(
  project: Project,
  dev: DeveloperWithProfile
): { score: number; details: MatchDetail[] } {
  const details: MatchDetail[] = [];

  // Determine which criteria are active (have ICP values set)
  const activeCriteria: (CriterionDef & { icpValues: unknown })[] = [];
  for (const c of CRITERIA) {
    const icpVal = project[c.icpField];
    if (c.type === "experience") {
      const min = getNumber(icpVal);
      if (min != null && min > 0) activeCriteria.push({ ...c, icpValues: min });
    } else if (c.type === "enum") {
      const arr = getArray(icpVal);
      if (arr.length > 0) activeCriteria.push({ ...c, icpValues: arr });
    } else {
      const arr = getArray(icpVal);
      if (arr.length > 0) activeCriteria.push({ ...c, icpValues: arr });
    }
  }

  if (activeCriteria.length === 0) return { score: 0, details: [] };

  // Redistribute weights so active criteria sum to 100
  const totalActiveWeight = activeCriteria.reduce((s, c) => s + c.weight, 0);
  const scale = 100 / totalActiveWeight;

  let totalEarned = 0;

  for (const c of activeCriteria) {
    const effectiveWeight = c.weight * scale;
    let earned = 0;
    let matched: string[] = [];
    let total = 0;

    if (c.type === "array") {
      const icpArr = c.icpValues as string[];
      const devArr = getArray(dev[c.devField]);
      matched = arrayOverlap(icpArr, devArr);
      total = icpArr.length;
      earned = total > 0 ? effectiveWeight * (matched.length / total) : 0;
    } else if (c.type === "enum") {
      const icpArr = c.icpValues as string[];
      const devVal = getString(dev[c.devField]);
      total = icpArr.length;
      if (devVal && icpArr.some((v) => v.toLowerCase() === devVal.toLowerCase())) {
        matched = [devVal];
        earned = effectiveWeight;
      }
    } else if (c.type === "experience") {
      const minExp = c.icpValues as number;
      const devExp = getNumber(dev[c.devField]);
      total = 1;
      if (devExp != null) {
        if (devExp >= minExp) {
          matched = [`${devExp} yrs`];
          earned = effectiveWeight;
        } else if (devExp >= minExp - 2) {
          matched = [`${devExp} yrs (close)`];
          earned = effectiveWeight * 0.5;
        }
      }
    }

    if (earned > 0) {
      details.push({
        category: c.devField as string,
        label: c.label,
        matched,
        total,
        weight: Math.round(effectiveWeight),
        earned: Math.round(earned * 10) / 10,
      });
    }

    totalEarned += earned;
  }

  return { score: Math.round(totalEarned), details };
}

// ── Main export ────────────────────────────────────────────────

export function scoreAndRankDevelopers(
  project: Project,
  developers: DeveloperWithProfile[],
  excludeIds: Set<string>,
  limit = 20
): DeveloperMatch[] {
  const results: DeveloperMatch[] = [];

  for (const dev of developers) {
    if (excludeIds.has(dev.id)) continue;
    const { score, details } = scoreDeveloper(project, dev);
    if (score > 0) {
      results.push({
        developer: dev,
        score,
        matchDetails: details.sort((a, b) => b.earned - a.earned),
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
