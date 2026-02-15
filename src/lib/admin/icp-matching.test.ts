import { describe, it, expect } from "vitest";
import { scoreAndRankDevelopers } from "./icp-matching";
import type { Project, DeveloperWithProfile } from "@/types/admin";

// Minimal factory — only sets fields the matcher actually reads
function makeProject(icp: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    icp_role_types: null,
    icp_seniority_levels: null,
    icp_languages: null,
    icp_min_experience: null,
    icp_frameworks: null,
    icp_industries: null,
    icp_databases: null,
    icp_cloud_platforms: null,
    icp_buying_influence: null,
    icp_company_size_range: null,
    icp_devops_tools: null,
    icp_cicd_tools: null,
    icp_testing_frameworks: null,
    icp_api_experience: null,
    icp_operating_systems: null,
    icp_paid_tools: null,
    icp_open_source_activity: null,
    icp_team_size_range: null,
    ...icp,
  } as Project;
}

function makeDev(
  id: string,
  fields: Partial<DeveloperWithProfile> = {}
): DeveloperWithProfile {
  return {
    id,
    role_types: null,
    seniority: null,
    languages: null,
    years_experience: null,
    frameworks: null,
    industries: null,
    databases: null,
    cloud_platforms: null,
    buying_influence: null,
    company_size: null,
    devops_tools: null,
    cicd_tools: null,
    testing_frameworks: null,
    api_experience: null,
    operating_systems: null,
    paid_tools: null,
    open_source_activity: null,
    profiles: { full_name: `Dev ${id}`, email: `${id}@test.com`, avatar_url: null },
    ...fields,
  } as DeveloperWithProfile;
}

describe("scoreAndRankDevelopers", () => {
  // ── Edge cases ──

  it("returns empty array when project has no ICP criteria set", () => {
    const result = scoreAndRankDevelopers(
      makeProject(),
      [makeDev("1", { languages: ["TypeScript"] })],
      new Set()
    );
    expect(result).toEqual([]);
  });

  it("returns empty array when developer list is empty", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript"] }),
      [],
      new Set()
    );
    expect(result).toEqual([]);
  });

  it("excludes developers in the excludeIds set", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript"] }),
      [makeDev("1", { languages: ["TypeScript"] })],
      new Set(["1"])
    );
    expect(result).toEqual([]);
  });

  // ── Array matching (OR-based) ──

  it("scores full match on a single array criterion as 100", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript"] }),
      [makeDev("1", { languages: ["TypeScript"] })],
      new Set()
    );
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  it("scores partial array match proportionally", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript", "Python", "Go", "Rust"] }),
      [makeDev("1", { languages: ["TypeScript", "Python"] })],
      new Set()
    );
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(50);
  });

  it("performs case-insensitive array matching", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["typescript"] }),
      [makeDev("1", { languages: ["TypeScript"] })],
      new Set()
    );
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  // ── Enum matching ──

  it("scores full match on an enum criterion", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_seniority_levels: ["senior"] }),
      [makeDev("1", { seniority: "senior" })],
      new Set()
    );
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  it("excludes developers with no enum match (score 0)", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_seniority_levels: ["senior"] }),
      [makeDev("1", { seniority: "junior" })],
      new Set()
    );
    expect(result).toHaveLength(0);
  });

  // ── Experience matching ──

  it("gives full score when experience meets minimum", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_min_experience: 5 }),
      [makeDev("1", { years_experience: 7 })],
      new Set()
    );
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(100);
  });

  it("gives half score when experience is within 2 years of minimum", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_min_experience: 5 }),
      [makeDev("1", { years_experience: 4 })],
      new Set()
    );
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(50);
  });

  it("excludes developers more than 2 years below minimum", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_min_experience: 10 }),
      [makeDev("1", { years_experience: 5 })],
      new Set()
    );
    expect(result).toHaveLength(0);
  });

  // ── Weight redistribution ──

  it("redistributes weights when only some criteria are active", () => {
    // Languages weight=15, Frameworks weight=8. Total=23, scale=100/23
    // Dev matches languages fully but not frameworks:
    // earned = 15 * (100/23) = 65.217... → Math.round = 65
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript"], icp_frameworks: ["React", "Vue"] }),
      [makeDev("1", { languages: ["TypeScript"] })],
      new Set()
    );
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(65);
  });

  // ── Ranking and limits ──

  it("returns developers ranked by score descending", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript", "Python"] }),
      [
        makeDev("1", { languages: ["TypeScript"] }),
        makeDev("2", { languages: ["TypeScript", "Python"] }),
        makeDev("3", { languages: ["Python"] }),
      ],
      new Set()
    );
    expect(result).toHaveLength(3);
    expect(result[0].developer.id).toBe("2");
    expect(result[0].score).toBe(100);
  });

  it("respects explicit limit parameter", () => {
    const devs = Array.from({ length: 30 }, (_, i) =>
      makeDev(`${i}`, { languages: ["TypeScript"] })
    );
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript"] }),
      devs,
      new Set(),
      5
    );
    expect(result).toHaveLength(5);
  });

  it("uses default limit of 20", () => {
    const devs = Array.from({ length: 30 }, (_, i) =>
      makeDev(`${i}`, { languages: ["TypeScript"] })
    );
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript"] }),
      devs,
      new Set()
    );
    expect(result).toHaveLength(20);
  });

  // ── Match details ──

  it("includes matchDetails sorted by earned descending", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["TypeScript"], icp_role_types: ["backend"] }),
      [makeDev("1", { languages: ["TypeScript"], role_types: ["backend"] })],
      new Set()
    );
    expect(result[0].matchDetails.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < result[0].matchDetails.length; i++) {
      expect(result[0].matchDetails[i - 1].earned).toBeGreaterThanOrEqual(
        result[0].matchDetails[i].earned
      );
    }
  });

  // ── Zero-match exclusion ──

  it("excludes developers with zero matching criteria", () => {
    const result = scoreAndRankDevelopers(
      makeProject({ icp_languages: ["Rust"] }),
      [
        makeDev("1", { languages: ["TypeScript"] }),
        makeDev("2", { languages: ["Rust"] }),
      ],
      new Set()
    );
    expect(result).toHaveLength(1);
    expect(result[0].developer.id).toBe("2");
  });
});
