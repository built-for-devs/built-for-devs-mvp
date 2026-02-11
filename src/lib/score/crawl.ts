import type { CrawledPage, CrawlResult } from "./types";

const JINA_PREFIX = "https://r.jina.ai/";
const MAX_CONTENT_LENGTH = 50000;
const CRAWL_TIMEOUT_MS = 20000;

// Common documentation paths to try on the same origin
const DISCOVERY_PATHS = [
  "/docs",
  "/documentation",
  "/developers",
  "/developer",
  "/api",
  "/api-reference",
  "/reference",
  "/guides",
  "/getting-started",
  "/quickstart",
  "/tutorials",
  "/pricing",
  "/sdk",
];

// Common subdomains where docs live
const DOC_SUBDOMAINS = ["docs", "developer", "developers"];

// Patterns that indicate a URL is documentation-related
const DOC_URL_PATTERNS = [
  /\/docs\b/i,
  /\/documentation\b/i,
  /\/api[-/]?(?:reference|docs)?\b/i,
  /\/reference\b/i,
  /\/guides?\b/i,
  /\/getting[-_]?started\b/i,
  /\/quickstart\b/i,
  /\/tutorials?\b/i,
  /\/developers?\b/i,
  /\/sdk\b/i,
  /\/learn\b/i,
  /docs\./i,
  /developer\./i,
];

export async function crawlTarget(targetUrl: string): Promise<CrawlResult> {
  const pages: CrawledPage[] = [];
  let totalChars = 0;

  const parsedUrl = new URL(targetUrl);
  const origin = parsedUrl.origin;
  const rootDomain = getRootDomain(parsedUrl.hostname);

  // 1. Crawl the submitted URL (required)
  const homepage = await crawlPage(targetUrl, "Homepage");
  pages.push(homepage);
  if (homepage.status === "success") {
    totalChars += homepage.content.length;
  }

  // 2. Extract doc-related URLs from homepage content
  const discoveredUrls = homepage.status === "success"
    ? extractDocUrls(homepage.content, origin, rootDomain)
    : [];

  // 3. Build candidate URLs: discovered links first, then fallback paths + subdomains
  const candidateUrls = new Map<string, string>(); // url -> label

  // Discovered links get priority (they're actual links from the site)
  for (const { url, label } of discoveredUrls) {
    candidateUrls.set(url, label);
  }

  // Fallback: try common paths on same origin
  for (const path of DISCOVERY_PATHS) {
    const pageUrl = `${origin}${path}`;
    if (!candidateUrls.has(pageUrl) && pageUrl !== targetUrl) {
      candidateUrls.set(pageUrl, capitalize(path.slice(1).replace(/[-_]/g, " ")));
    }
  }

  // Fallback: try common doc subdomains
  if (rootDomain) {
    for (const sub of DOC_SUBDOMAINS) {
      const subUrl = `https://${sub}.${rootDomain}`;
      if (!candidateUrls.has(subUrl) && subUrl !== targetUrl) {
        candidateUrls.set(subUrl, `${capitalize(sub)} subdomain`);
      }
    }
  }

  // 4. Crawl candidates in parallel batches (up to 5 at a time)
  const candidates = Array.from(candidateUrls.entries());
  const batchSize = 5;

  for (let i = 0; i < candidates.length; i += batchSize) {
    if (totalChars >= MAX_CONTENT_LENGTH) break;

    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(([url, label]) => crawlPage(url, label))
    );

    for (const page of results) {
      if (totalChars >= MAX_CONTENT_LENGTH) {
        // Still record the page as skipped so we know we tried
        if (page.status === "success") {
          page.status = "skipped";
          page.content = "";
          page.error = "Content cap reached";
        }
        pages.push(page);
        continue;
      }

      if (page.status === "success") {
        const remaining = MAX_CONTENT_LENGTH - totalChars;
        if (page.content.length > remaining) {
          page.content =
            page.content.slice(0, remaining) + "\n\n[Content truncated]";
        }
        totalChars += page.content.length;
      }

      pages.push(page);
    }
  }

  return {
    pages,
    totalTokensEstimate: Math.ceil(totalChars / 4),
  };
}

/**
 * Extract URLs from crawled content that look like documentation pages.
 * Jina Reader returns markdown-style text with [text](url) links.
 */
function extractDocUrls(
  content: string,
  origin: string,
  rootDomain: string | null
): { url: string; label: string }[] {
  const found: { url: string; label: string }[] = [];
  const seen = new Set<string>();

  // Match markdown-style links: [label](url)
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const label = match[1];
    const url = match[2];

    // Skip if already seen or is the same as the target
    if (seen.has(url)) continue;

    // Check if the URL looks documentation-related
    const isDocUrl = DOC_URL_PATTERNS.some((pattern) => pattern.test(url));
    const isSameDomain =
      rootDomain && url.includes(rootDomain);

    if (isDocUrl && isSameDomain) {
      seen.add(url);
      found.push({ url, label: label.slice(0, 50) });
    }
  }

  // Also look for plain URLs that match doc patterns
  const plainUrlRegex = /https?:\/\/[^\s)<>"]+/g;
  while ((match = plainUrlRegex.exec(content)) !== null) {
    const url = match[0];
    if (seen.has(url)) continue;

    const isDocUrl = DOC_URL_PATTERNS.some((pattern) => pattern.test(url));
    const isSameDomain = rootDomain && url.includes(rootDomain);

    if (isDocUrl && isSameDomain) {
      seen.add(url);
      // Generate label from URL path
      try {
        const path = new URL(url).pathname;
        found.push({ url, label: capitalize(path.slice(1).split("/")[0].replace(/[-_]/g, " ")) || "Docs" });
      } catch {
        found.push({ url, label: "Docs" });
      }
    }
  }

  // Limit to 8 discovered URLs to avoid excessive crawling
  return found.slice(0, 8);
}

/**
 * Extract root domain from hostname (e.g., "www.stripe.com" → "stripe.com")
 */
function getRootDomain(hostname: string): string | null {
  const parts = hostname.split(".");
  if (parts.length < 2) return null;
  return parts.slice(-2).join(".");
}

async function crawlPage(url: string, label: string): Promise<CrawledPage> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);

    const response = await fetch(`${JINA_PREFIX}${url}`, {
      headers: { Accept: "text/plain" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { url, label, content: "", status: "failed", error: `HTTP ${response.status}` };
    }

    const content = await response.text();

    if (content.length < 100) {
      return { url, label, content: "", status: "skipped", error: "Content too short (likely 404)" };
    }

    return { url, label, content, status: "success" };
  } catch (err) {
    return {
      url,
      label,
      content: "",
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
