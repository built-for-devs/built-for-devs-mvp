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

/**
 * Extract a GitHub username from search results.
 * Matches github.com/{username} profile URLs (ignoring query params, trailing slashes).
 */
function extractGitHubUsername(results: SerperResult[]): string | null {
  // Match github.com/{username} — ignore query params and trailing path
  const profilePattern = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9-]+)\/?(?:\?.*)?$/;

  const reserved = new Set([
    "about", "features", "pricing", "enterprise", "login", "signup",
    "explore", "marketplace", "topics", "trending", "collections",
    "sponsors", "settings", "organizations", "orgs", "search",
  ]);

  for (const result of results) {
    const match = result.link.match(profilePattern);
    if (match) {
      const username = match[1];
      if (!reserved.has(username.toLowerCase())) {
        return username;
      }
    }
  }

  return null;
}

/**
 * Search Google for a GitHub profile matching the given name/company.
 * Tries with company first for precision, then name-only as fallback.
 * Returns the GitHub username if found, or null.
 */
export async function searchGitHubProfile(
  name: string,
  company?: string | null
): Promise<string | null> {
  const key = getApiKey();

  // Try with company first (more precise)
  if (company) {
    const result = await serperSearch(key, `site:github.com "${name}" "${company}"`);
    if (result) return result;
  }

  // Fallback: name only
  return serperSearch(key, `site:github.com "${name}"`);
}

async function serperSearch(key: string, q: string): Promise<string | null> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q, num: 5 }),
  });

  if (!res.ok) {
    console.error(`Serper search failed: ${res.status} ${res.statusText}`);
    return null;
  }

  const data = await res.json();
  const organic: SerperResult[] = data.organic ?? [];
  return extractGitHubUsername(organic);
}
