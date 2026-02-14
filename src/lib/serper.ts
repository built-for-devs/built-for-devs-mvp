/**
 * Serper.dev Google Search API client.
 * Used to find GitHub profiles via Google search as a middle-tier
 * in the GitHub discovery cascade (between free GitHub API search and SixtyFour).
 */

let apiKey: string | null = null;

function getApiKey(): string {
  if (!apiKey) {
    apiKey = process.env.SERPER_API_KEY ?? null;
    if (!apiKey) throw new Error("SERPER_API_KEY is not set");
  }
  return apiKey;
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

const RESERVED_PATHS = new Set([
  "about", "features", "pricing", "enterprise", "login", "signup",
  "explore", "marketplace", "topics", "trending", "collections",
  "sponsors", "settings", "organizations", "orgs", "search",
  "pulls", "issues", "notifications", "new", "codespaces",
]);

/**
 * Extract a GitHub username from search results.
 * Matches both profile URLs (github.com/{username}) and
 * repo URLs (github.com/{username}/{repo}) — extracting the owner.
 */
function extractGitHubUsername(results: SerperResult[]): string | null {
  // Match github.com/{username} with optional additional path segments
  const githubPattern = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)(?:\/.*)?$/;

  for (const result of results) {
    const match = result.link.match(githubPattern);
    if (match) {
      const username = match[1];
      if (!RESERVED_PATHS.has(username.toLowerCase())) {
        return username;
      }
    }
  }

  return null;
}

/**
 * Search Google for a GitHub profile matching the given name/company/LinkedIn.
 * Tries multiple query strategies, most precise first:
 *   1. Name + company (exact quotes)
 *   2. Name only (exact quotes)
 *   3. LinkedIn slug on GitHub (if available)
 *   4. Name + company (no quotes, broader match)
 * Returns the GitHub username if found, or null.
 */
export async function searchGitHubProfile(
  name: string,
  company?: string | null,
  linkedinUrl?: string | null
): Promise<string | null> {
  const key = getApiKey();

  // 1. Try with company first (most precise)
  if (company) {
    const result = await serperSearch(key, `site:github.com "${name}" "${company}"`);
    if (result) return result;
  }

  // 2. Name only with exact quotes
  const result = await serperSearch(key, `site:github.com "${name}"`);
  if (result) return result;

  // 3. Try LinkedIn slug — people often cross-link profiles
  if (linkedinUrl) {
    const slug = linkedinUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1];
    if (slug) {
      const linkedinResult = await serperSearch(key, `site:github.com "${slug}"`);
      if (linkedinResult) return linkedinResult;
    }
  }

  // 4. Broader search without exact quotes (catches name variations)
  if (company) {
    const broadResult = await serperSearch(key, `site:github.com ${name} ${company}`);
    if (broadResult) return broadResult;
  }

  return null;
}

async function serperSearch(key: string, q: string): Promise<string | null> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q, num: 10 }),
  });

  if (!res.ok) {
    console.error(`Serper search failed: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = await res.json();
  const organic: SerperResult[] = data.organic ?? [];
  return extractGitHubUsername(organic);
}
