/**
 * AgentQL API client for extracting full LinkedIn profile data.
 *
 * Uses AgentQL's REST API with stealth browser profile and managed proxy
 * to visit LinkedIn profiles and extract comprehensive profile context
 * (about section, experience descriptions, skills, education, etc.).
 *
 * The raw profile JSON is stored in the DB, then Claude extracts structured fields.
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

/** Raw profile data extracted by AgentQL — stored in DB as JSON */
export interface LinkedInRawProfile {
  full_name: string | null;
  headline: string | null;
  location: string | null;
  about: string | null;
  experience: {
    title: string | null;
    company: string | null;
    date_range: string | null;
    location: string | null;
    description: string | null;
  }[];
  education: {
    school: string | null;
    degree: string | null;
    field_of_study: string | null;
    date_range: string | null;
  }[];
  skills: string[];
  certifications: string[];
  languages: string[];
}

const LINKEDIN_EXTRACTION_PROMPT = `Extract the complete LinkedIn profile visible on this page. Return a JSON object with these fields:

- full_name: The person's full name
- headline: Their professional headline/tagline
- location: Their location (city, state/region, country)
- about: The COMPLETE text of their About section — do NOT summarize or truncate, include every word
- experience: An array of ALL work experience entries, each with:
  - title: Job title
  - company: Company name
  - date_range: Date range (e.g. "Jan 2020 - Present")
  - location: Work location if shown
  - description: The COMPLETE description text for this role — do NOT summarize or truncate
- education: An array of education entries, each with:
  - school: School name
  - degree: Degree type
  - field_of_study: Field of study
  - date_range: Date range
- skills: Array of all skill names listed
- certifications: Array of certification names
- languages: Array of languages listed

Important: Include ALL text content exactly as shown. Do not summarize descriptions.
If a section is not visible or empty, use null for strings and empty arrays for lists.`;

/**
 * Scrape a LinkedIn profile URL via AgentQL and return the full raw profile.
 * Uses stealth browser profile + managed proxy for anti-detection.
 * Returns null if the scrape fails.
 */
export async function scrapeLinkedInProfile(
  linkedinUrl: string
): Promise<LinkedInRawProfile | null> {
  const key = getApiKey();

  const res = await fetch("https://api.agentql.com/v1/query-data", {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: linkedinUrl,
      prompt: LINKEDIN_EXTRACTION_PROMPT,
      params: {
        wait_for: 5,
        is_scroll_to_bottom_enabled: true,
        mode: "standard",
        browser_profile: "stealth",
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[AgentQL] Scrape failed for ${linkedinUrl}: ${res.status} ${text}`
    );
    return null;
  }

  const json = await res.json();
  const data = json?.data ?? null;

  if (!data) {
    console.warn(`[AgentQL] No data returned for ${linkedinUrl}`);
    return null;
  }

  console.log(
    `[AgentQL] Scraped ${linkedinUrl}: ${JSON.stringify(data).length} chars`
  );

  // Normalize into our interface — AgentQL may return slightly different shapes
  return {
    full_name: data.full_name || null,
    headline: data.headline || null,
    location: data.location || null,
    about: data.about || null,
    experience: Array.isArray(data.experience)
      ? data.experience.map((e: Record<string, unknown>) => ({
          title: (e.title as string) || null,
          company: (e.company as string) || null,
          date_range: (e.date_range as string) || null,
          location: (e.location as string) || null,
          description: (e.description as string) || null,
        }))
      : [],
    education: Array.isArray(data.education)
      ? data.education.map((e: Record<string, unknown>) => ({
          school: (e.school as string) || null,
          degree: (e.degree as string) || null,
          field_of_study: (e.field_of_study as string) || null,
          date_range: (e.date_range as string) || null,
        }))
      : [],
    skills: Array.isArray(data.skills)
      ? data.skills.filter(
          (s: unknown) => typeof s === "string" && s.length > 0
        )
      : [],
    certifications: Array.isArray(data.certifications)
      ? data.certifications.filter(
          (s: unknown) => typeof s === "string" && s.length > 0
        )
      : [],
    languages: Array.isArray(data.languages)
      ? data.languages.filter(
          (s: unknown) => typeof s === "string" && s.length > 0
        )
      : [],
  };
}
