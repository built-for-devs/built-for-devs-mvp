/**
 * AgentQL API client for extracting structured data from LinkedIn profiles.
 * Uses AgentQL's headless browser to visit LinkedIn and extract profile fields.
 *
 * Rate limiting: caller is responsible for spacing requests (8s+ between calls)
 * to avoid LinkedIn anti-detection.
 */

let apiKey: string | null = null;

function getApiKey(): string {
  if (!apiKey) {
    apiKey = process.env.AGENTQL_API_KEY ?? null;
    if (!apiKey) throw new Error("AGENTQL_API_KEY is not set");
  }
  return apiKey;
}

export interface LinkedInProfileData {
  headline: string | null;
  jobTitle: string | null;
  company: string | null;
  location: string | null;
  experienceYears: number | null;
  skills: string[];
}

/**
 * Query a LinkedIn profile URL via AgentQL and extract structured profile data.
 * Returns null if the query fails or the profile can't be loaded.
 */
export async function queryLinkedInProfile(
  linkedinUrl: string
): Promise<LinkedInProfileData | null> {
  const key = getApiKey();

  const res = await fetch("https://api.agentql.com/v1/query-data", {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: linkedinUrl,
      query:
        "{ profile { headline job_title current_company location experience_years skills[] } }",
      params: {
        wait_for: 3000,
        is_scroll_to_bottom_enabled: false,
        mode: "standard",
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[AgentQL] Query failed for ${linkedinUrl}: ${res.status} ${text}`
    );
    return null;
  }

  const data = await res.json();
  const profile = data?.data?.profile ?? data?.profile ?? null;

  if (!profile) {
    console.warn(`[AgentQL] No profile data returned for ${linkedinUrl}`);
    return null;
  }

  // Parse experience_years into a number
  let experienceYears: number | null = null;
  if (profile.experience_years != null) {
    const parsed =
      typeof profile.experience_years === "number"
        ? profile.experience_years
        : parseInt(String(profile.experience_years), 10);
    if (!isNaN(parsed) && parsed > 0) experienceYears = parsed;
  }

  return {
    headline: profile.headline || null,
    jobTitle: profile.job_title || null,
    company: profile.current_company || null,
    location: profile.location || null,
    experienceYears,
    skills: Array.isArray(profile.skills)
      ? profile.skills.filter((s: unknown) => typeof s === "string" && s.length > 0)
      : [],
  };
}
