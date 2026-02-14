/**
 * Server-side contact enrichment via GitHub API + Claude.
 *
 * 1. Find GitHub profile by email or name
 * 2. Scrape repos for languages, topics, and profile data
 * 3. Claude Haiku interprets the data into structured enrichment fields
 * 4. Results are written back to Folk CRM
 */

import Anthropic from "@anthropic-ai/sdk";

// ── Types ──────────────────────────────────────────────────────

export interface EnrichmentInput {
  folkId: string;
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  jobTitle?: string | null;
  company?: string | null;
}

export interface EnrichmentResult {
  folkId: string;
  name: string;
  status: "enriched" | "partial" | "failed";
  data?: EnrichmentData;
  confidenceScore?: number;
  error?: string;
}

export interface EnrichmentData {
  seniority: string | null;
  roleType: string | null;
  languages: string | null;
  frameworks: string | null;
  databases: string | null;
  cloudPlatforms: string | null;
  paidTools: string | null;
  devopsTools: string | null;
  cicdTools: string | null;
  testingFrameworks: string | null;
  buyingInfluence: string | null;
  industries: string | null;
  companySize: string | null;
  yearsExperience: string | null;
  location: string | null;
  city: string | null;
  stateRegion: string | null;
  country: string | null;
  jobTitle: string | null;
  company: string | null;
  // Direct GitHub fields (not from Claude)
  githubUsername: string | null;
  githubBlog: string | null;
  twitterUsername: string | null;
  linkedinUrl: string | null;
  openSourceActivity: string | null;
}

// ── GitHub API ────────────────────────────────────────────────

interface GitHubProfile {
  login: string;
  name: string | null;
  email: string | null;
  company: string | null;
  location: string | null;
  bio: string | null;
  blog: string | null;
  twitterUsername: string | null;
  linkedinUrl: string | null;
  publicRepos: number;
  followers: number;
  createdAt: string;
}

interface GitHubRepoData {
  languages: Record<string, number>; // language → repo count
  topics: string[];
  descriptions: string[]; // non-empty repo descriptions for Claude context
  repoCount: number;
  oldestRepoDate: string | null;
}

function githubHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function findGitHubUser(
  input: EnrichmentInput
): Promise<string | null> {
  const headers = githubHeaders();

  // 1. Try email search (most precise)
  if (input.email) {
    const q = encodeURIComponent(`${input.email} in:email`);
    const res = await fetch(
      `https://api.github.com/search/users?q=${q}&per_page=1`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) return data.items[0].login;
    }
  }

  // 2. Try LinkedIn slug as GitHub username (many devs use the same handle)
  if (input.linkedinUrl) {
    const slug = input.linkedinUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1];
    if (slug) {
      const username = await checkGitHubUsername(slug, input.name, headers);
      if (username) return username;
    }
  }

  // 3. Fallback: name + company search
  if (input.name) {
    const nameParts = [input.name];
    if (input.company) nameParts.push(input.company);
    const q = encodeURIComponent(`${nameParts.join(" ")} in:name`);
    const res = await fetch(
      `https://api.github.com/search/users?q=${q}&per_page=5`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) return data.items[0].login;
    }
  }

  // 4. Name-only search (without company, catches more results)
  if (input.name && input.company) {
    const q = encodeURIComponent(`${input.name} in:name`);
    const res = await fetch(
      `https://api.github.com/search/users?q=${q}&per_page=5`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) return data.items[0].login;
    }
  }

  return null;
}

/**
 * Check if a username exists on GitHub and loosely matches the expected name.
 * Used to test LinkedIn slugs as potential GitHub usernames.
 */
async function checkGitHubUsername(
  candidateUsername: string,
  expectedName: string,
  headers: HeadersInit
): Promise<string | null> {
  try {
    const res = await fetch(`https://api.github.com/users/${candidateUsername}`, { headers });
    if (!res.ok) return null;

    const user = await res.json();
    // Accept if the profile exists — the LinkedIn slug is a strong signal
    // Loose name check: if they have a name set, at least one name part should match
    if (user.name) {
      const profileParts = user.name.toLowerCase().split(/\s+/);
      const expectedParts = expectedName.toLowerCase().split(/\s+/);
      const hasOverlap = expectedParts.some((p: string) =>
        profileParts.some((pp: string) => pp === p || pp.startsWith(p) || p.startsWith(pp))
      );
      if (hasOverlap) return user.login;
      // Name doesn't match at all — might be a different person with the same slug
      return null;
    }

    // No name set on profile — accept it (LinkedIn slug match is strong enough)
    return user.login;
  } catch {
    return null;
  }
}

async function getGitHubProfile(
  username: string
): Promise<GitHubProfile> {
  const headers = githubHeaders();
  const res = await fetch(`https://api.github.com/users/${username}`, { headers });
  if (!res.ok) throw new Error(`GitHub profile error (${res.status})`);
  const u = await res.json();

  // Check blog field for LinkedIn URL
  let linkedinUrl: string | null = null;
  const blog: string | null = u.blog || null;
  if (blog && blog.includes("linkedin.com")) {
    linkedinUrl = blog.startsWith("http") ? blog : `https://${blog}`;
  }

  // Fetch social accounts for LinkedIn (best-effort)
  if (!linkedinUrl) {
    try {
      const socialRes = await fetch(
        `https://api.github.com/users/${username}/social_accounts`,
        { headers }
      );
      if (socialRes.ok) {
        const accounts: { provider: string; url: string }[] = await socialRes.json();
        const linkedin = accounts.find(
          (a) => a.provider === "linkedin" || a.url.includes("linkedin.com")
        );
        if (linkedin) linkedinUrl = linkedin.url;
      }
    } catch {
      // Non-fatal — social accounts endpoint may not be available
    }
  }

  return {
    login: u.login,
    name: u.name ?? null,
    email: u.email ?? null,
    company: u.company ?? null,
    location: u.location ?? null,
    bio: u.bio ?? null,
    blog: linkedinUrl ? null : blog, // Don't store LinkedIn as blog
    twitterUsername: u.twitter_username ?? null,
    linkedinUrl,
    publicRepos: u.public_repos ?? 0,
    followers: u.followers ?? 0,
    createdAt: u.created_at,
  };
}

async function getGitHubRepoData(
  username: string
): Promise<GitHubRepoData> {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?per_page=100&sort=pushed&type=owner`,
    { headers: githubHeaders() }
  );
  if (!res.ok) throw new Error(`GitHub repos error (${res.status})`);
  const repos: Array<{
    language: string | null;
    description: string | null;
    topics: string[];
    fork: boolean;
    created_at: string;
  }> = await res.json();

  const languages: Record<string, number> = {};
  const topicsSet = new Set<string>();
  const descriptions: string[] = [];
  let oldestDate: string | null = null;
  let repoCount = 0;

  for (const repo of repos) {
    if (repo.fork) continue;
    repoCount++;
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] ?? 0) + 1;
    }
    if (repo.description && descriptions.length < 20) {
      descriptions.push(repo.description);
    }
    for (const t of repo.topics ?? []) {
      topicsSet.add(t);
    }
    if (!oldestDate || repo.created_at < oldestDate) {
      oldestDate = repo.created_at;
    }
  }

  return {
    languages,
    topics: Array.from(topicsSet),
    descriptions,
    repoCount,
    oldestRepoDate: oldestDate,
  };
}

/**
 * Fetch the user's profile README (the repo named after their username).
 * Returns the raw markdown text, truncated to ~3000 chars to stay within prompt limits.
 */
async function getGitHubReadme(username: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${username}/${username}/main/README.md`,
      { headers: githubHeaders() }
    );
    if (!res.ok) {
      // Try master branch as fallback
      const res2 = await fetch(
        `https://raw.githubusercontent.com/${username}/${username}/master/README.md`,
        { headers: githubHeaders() }
      );
      if (!res2.ok) return null;
      const text = await res2.text();
      return text.slice(0, 3000);
    }
    const text = await res.text();
    return text.slice(0, 3000);
  } catch {
    return null;
  }
}

// ── Claude Extraction ─────────────────────────────────────────

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

async function extractWithClaude(
  profile: GitHubProfile | null,
  repoData: GitHubRepoData | null,
  input: EnrichmentInput,
  readme?: string | null
): Promise<EnrichmentData> {
  // Build ranked language list from GitHub
  const rankedLanguages = repoData
    ? Object.entries(repoData.languages)
        .sort((a, b) => b[1] - a[1])
        .map(([lang]) => lang)
    : [];

  // Estimate years from GitHub account age
  const githubYears = profile
    ? Math.max(
        1,
        new Date().getFullYear() - new Date(profile.createdAt).getFullYear()
      )
    : null;

  const contextParts: string[] = [];
  contextParts.push(`Person: ${input.name}`);
  if (input.email) contextParts.push(`Email: ${input.email}`);
  if (input.jobTitle) contextParts.push(`Job title (from CRM): ${input.jobTitle}`);
  if (input.company) contextParts.push(`Company (from CRM): ${input.company}`);
  if (input.linkedinUrl) contextParts.push(`LinkedIn: ${input.linkedinUrl}`);

  if (profile) {
    contextParts.push(`\nGitHub profile (@${profile.login}):`);
    if (profile.name) contextParts.push(`  Name: ${profile.name}`);
    if (profile.bio) contextParts.push(`  Bio: ${profile.bio}`);
    if (profile.company) contextParts.push(`  Company: ${profile.company}`);
    if (profile.location) contextParts.push(`  Location: ${profile.location}`);
    contextParts.push(`  Public repos: ${profile.publicRepos}`);
    contextParts.push(`  Followers: ${profile.followers}`);
    contextParts.push(`  Account created: ${profile.createdAt}`);
  }

  if (repoData && repoData.repoCount > 0) {
    contextParts.push(`\nGitHub repositories (${repoData.repoCount} owned, non-fork):`);
    contextParts.push(`  Languages by repo count: ${rankedLanguages.map((l) => `${l} (${repoData.languages[l]})`).join(", ")}`);
    if (repoData.topics.length > 0) {
      contextParts.push(`  Topics across repos: ${repoData.topics.join(", ")}`);
    }
    if (repoData.descriptions.length > 0) {
      contextParts.push(`  Repo descriptions: ${repoData.descriptions.join(" | ")}`);
    }
    if (repoData.oldestRepoDate) {
      contextParts.push(`  Oldest repo: ${repoData.oldestRepoDate}`);
    }
  }

  if (githubYears) {
    contextParts.push(`\nGitHub account age: ~${githubYears} years`);
  }

  if (readme) {
    contextParts.push(`\nGitHub Profile README:\n${readme}`);
  }

  const prompt = `Analyze this developer's profile data and return a JSON object with the following fields.
Use ONLY the data provided — do not make up information. If a field cannot be determined, use null.

${contextParts.join("\n")}

Return a JSON object with these exact fields:
{
  "seniority": one of "leadership", "senior", or "early_career" (leadership = VP/Director/CTO/Founder; senior = Senior/Staff/Lead/5+ years; early_career = Junior/Intern/<5 years),
  "role_type": one of "full-stack", "frontend", "backend", "mobile", "devops", or "data-engineer",
  "languages": comma-separated programming languages from their repos and README (use the GitHub data directly),
  "frameworks": comma-separated frameworks/libraries from README, topics, repo names, and bio (React, Django, Express, Next.js, FastAPI, etc.),
  "databases": comma-separated database technologies if mentioned (PostgreSQL, MongoDB, Redis, Firebase, etc.),
  "cloud_platforms": comma-separated cloud providers if mentioned (AWS, GCP, Azure, Vercel, etc.),
  "paid_tools": comma-separated paid dev tools if mentioned,
  "devops_tools": comma-separated DevOps tools if mentioned (Docker, Kubernetes, Terraform, Ansible, etc.),
  "cicd_tools": comma-separated CI/CD tools if mentioned (GitHub Actions, Jenkins, CircleCI, etc.),
  "testing_frameworks": comma-separated testing tools if mentioned (Jest, Pytest, Cypress, Playwright, etc.),
  "buying_influence": one of "decision_maker", "budget_holder", "team_influencer", or "individual_contributor",
  "industries": comma-separated industries they've worked in (SaaS, FinTech, Healthcare, etc.),
  "company_size": estimate current company size ("1-10", "11-50", "51-200", "201-1000", "1001-5000", "5000+"),
  "years_experience": estimated total years of professional software development (number as string),
  "city": city name or null,
  "state_region": full state/region name (e.g. "California" not "CA") or null,
  "country": full country name (e.g. "United States" not "US") or null,
  "job_title": their current job title,
  "company": their current company name
}

Return ONLY the JSON object, no markdown fences or extra text.`;

  const response = await getAnthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let parsed: Record<string, unknown>;
  try {
    // Strip markdown fences if Claude adds them
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Claude extraction parse error:", text);
    throw new Error("Failed to parse Claude response");
  }

  const toStr = (val: unknown): string | null => {
    if (typeof val === "string" && val.trim()) return val;
    return null;
  };

  const city = toStr(parsed.city);
  const stateRegion = toStr(parsed.state_region);
  const country = toStr(parsed.country);
  const locationParts = [city, stateRegion, country].filter(Boolean);

  // Determine open source activity level from repo count
  const repoCount = repoData?.repoCount ?? 0;
  let ossActivity: string | null = null;
  if (repoCount >= 20) ossActivity = "maintainer";
  else if (repoCount >= 10) ossActivity = "regular";
  else if (repoCount >= 3) ossActivity = "occasional";
  else if (repoCount > 0) ossActivity = "none";

  return {
    seniority: toStr(parsed.seniority),
    roleType: toStr(parsed.role_type),
    languages: rankedLanguages.length > 0 ? rankedLanguages.join(", ") : toStr(parsed.languages),
    frameworks: toStr(parsed.frameworks),
    databases: toStr(parsed.databases),
    cloudPlatforms: toStr(parsed.cloud_platforms),
    paidTools: toStr(parsed.paid_tools),
    devopsTools: toStr(parsed.devops_tools),
    cicdTools: toStr(parsed.cicd_tools),
    testingFrameworks: toStr(parsed.testing_frameworks),
    buyingInfluence: toStr(parsed.buying_influence),
    industries: toStr(parsed.industries),
    companySize: toStr(parsed.company_size),
    yearsExperience: toStr(parsed.years_experience),
    location: locationParts.length > 0 ? locationParts.join(", ") : null,
    city,
    stateRegion,
    country,
    jobTitle: toStr(parsed.job_title),
    company: toStr(parsed.company),
    // Direct GitHub fields
    githubUsername: profile?.login ?? null,
    githubBlog: profile?.blog ?? null,
    twitterUsername: profile?.twitterUsername ?? null,
    linkedinUrl: profile?.linkedinUrl ?? null,
    openSourceActivity: ossActivity,
  };
}

// ── Folk Update ────────────────────────────────────────────────

async function updateFolk(
  folkId: string,
  groupId: string,
  data: EnrichmentData
): Promise<{ ok: boolean; warning?: string }> {
  const key = process.env.FOLK_API_KEY;
  if (!key) throw new Error("FOLK_API_KEY not set");

  const customFields: Record<string, unknown> = {};
  if (data.seniority) customFields["Seniority level"] = data.seniority;
  if (data.roleType) customFields["Role type"] = data.roleType;
  if (data.languages) {
    customFields["Primary programming languages"] = data.languages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
  }
  if (data.frameworks) {
    customFields["Frameworks"] = data.frameworks
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
  }
  if (data.databases) {
    customFields["Databases"] = data.databases
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  if (data.industries) {
    customFields["Industries"] = data.industries
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);
  }
  if (data.yearsExperience) {
    customFields["Years of professional experience"] = Number(data.yearsExperience);
  }
  if (data.location) customFields["Location"] = data.location;

  if (Object.keys(customFields).length === 0) {
    return { ok: true };
  }

  const res = await fetch(`https://api.folk.app/v1/people/${folkId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customFieldValues: { [groupId]: customFields },
    }),
  });

  if (!res.ok) {
    const text = await res.text();

    // If the group doesn't have these custom fields, don't fail the whole enrichment.
    // The data will still be synced to BFD.
    if (res.status === 422 && text.includes("does not exist in group")) {
      console.warn(`Folk custom fields not available in group ${groupId} — skipping Folk update for ${folkId}`);
      return { ok: false, warning: "Folk group missing custom fields — data saved to BFD only" };
    }

    throw new Error(`Folk PATCH failed (${res.status}): ${text}`);
  }

  return { ok: true };
}

// ── Public API ─────────────────────────────────────────────────

export async function enrichContact(
  input: EnrichmentInput,
  groupId: string
): Promise<EnrichmentResult> {
  try {
    // 1. Find GitHub profile
    const username = await findGitHubUser(input);

    let profile: GitHubProfile | null = null;
    let repoData: GitHubRepoData | null = null;

    let readme: string | null = null;

    if (username) {
      // 2. Fetch profile, repos, and README in parallel
      [profile, repoData, readme] = await Promise.all([
        getGitHubProfile(username),
        getGitHubRepoData(username),
        getGitHubReadme(username),
      ]);
      console.log(`GitHub found for ${input.name}: @${username} (${repoData.repoCount} repos${readme ? ", has README" : ""})`);
    } else {
      console.log(`No GitHub profile found for ${input.name} — using Folk data only`);
    }

    // 3. Claude extracts structured data from GitHub + Folk input
    const data = await extractWithClaude(profile, repoData, input, readme);

    // 4. Count how many fields we got
    const filled = Object.values(data).filter((v) => v != null).length;

    if (filled === 0) {
      return { folkId: input.folkId, name: input.name, status: "failed", error: "No data found" };
    }

    // 5. Write to Folk (non-fatal if group lacks custom fields)
    const folkResult = await updateFolk(input.folkId, groupId, data);

    console.log(`Enrichment for ${input.name}: ${filled} fields${username ? ` (GitHub: @${username})` : ""}`);

    return {
      folkId: input.folkId,
      name: input.name,
      status: filled >= 3 ? "enriched" : "partial",
      data,
      ...(folkResult.warning ? { error: folkResult.warning } : {}),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { folkId: input.folkId, name: input.name, status: "failed", error: message };
  }
}

/**
 * Re-enrich an existing developer using GitHub + Claude.
 * Unlike enrichContact, this skips Folk and returns the data directly.
 * If a GitHub URL is provided, extracts the username from it instead of searching.
 */
export async function reEnrichDeveloper(input: {
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  githubUrl?: string | null;
}): Promise<{ status: "enriched" | "partial" | "failed"; data?: EnrichmentData; error?: string; githubEmail?: string }> {
  try {
    // If we already have their GitHub URL, extract username directly
    let username: string | null = null;
    if (input.githubUrl) {
      const match = input.githubUrl.match(/github\.com\/([^/]+)/);
      if (match) username = match[1];
    }

    // Otherwise search GitHub
    if (!username) {
      username = await findGitHubUser({
        folkId: "",
        name: input.name,
        email: input.email,
        linkedinUrl: input.linkedinUrl,
        jobTitle: input.jobTitle,
        company: input.company,
      });
    }

    let profile: GitHubProfile | null = null;
    let repoData: GitHubRepoData | null = null;
    let readme: string | null = null;

    if (username) {
      [profile, repoData, readme] = await Promise.all([
        getGitHubProfile(username),
        getGitHubRepoData(username),
        getGitHubReadme(username),
      ]);
      console.log(`Re-enrich: GitHub found for ${input.name}: @${username} (${repoData.repoCount} repos${readme ? ", has README" : ""})`);
    } else {
      console.log(`Re-enrich: No GitHub for ${input.name} — using existing data only`);
    }

    const data = await extractWithClaude(profile, repoData, {
      folkId: "",
      name: input.name,
      email: input.email,
      linkedinUrl: input.linkedinUrl,
      jobTitle: input.jobTitle,
      company: input.company,
    }, readme);

    const filled = Object.values(data).filter((v) => v != null).length;
    if (filled === 0) {
      return { status: "failed", error: "No data found" };
    }

    return {
      status: filled >= 3 ? "enriched" : "partial",
      data,
      githubEmail: profile?.email ?? undefined,
    };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Unknown error" };
  }
}
