import type { CrawledPage, CrawlResult } from "./types";

const TABSTACK_API_URL = "https://api.tabstack.ai/v1/extract/markdown";
const JINA_PREFIX = "https://r.jina.ai/";
const MAX_CONTENT_LENGTH = 80000;
const MAX_HOMEPAGE_LENGTH = 15000;
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

// Known third-party documentation platforms — URLs on these hosts
// should be crawled even if they don't share the product's domain
const KNOWN_DOC_PLATFORMS = [
  "readme.io",
  "readme.com",
  "gitbook.io",
  "gitbook.com",
  "mintlify.dev",
  "mintlify.app",
  "notion.site",
  "notion.so",
  "stoplight.io",
  "redocly.com",
  "swagger.io",
  "apiary.io",
  "postman.com",
  "github.io",
  "netlify.app",
  "vercel.app",
];

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

  // 2. Extract doc-related URLs from full homepage content BEFORE truncation
  const discoveredUrls = homepage.status === "success"
    ? extractDocUrls(homepage.content, origin, rootDomain)
    : [];

  // Track all discovered doc links for the prompt (even if we can't crawl them)
  const allDiscoveredDocLinks = [...discoveredUrls];

  // Truncate homepage to preserve content budget for doc pages
  if (homepage.status === "success") {
    if (homepage.content.length > MAX_HOMEPAGE_LENGTH) {
      homepage.content =
        homepage.content.slice(0, MAX_HOMEPAGE_LENGTH) +
        "\n\n[Homepage content truncated to prioritize documentation pages]";
    }
    totalChars += homepage.content.length;
  }
  pages.push(homepage);

  // 3. Build candidate URLs: doc root pages first, then discovered links, then fallbacks
  const candidateUrls = new Map<string, string>(); // url -> label

  // Derive doc root paths from discovered links and add them first (highest priority)
  // e.g., if we found /docs/api/auth, also try /docs as a root landing page
  for (const { url: docUrl } of discoveredUrls) {
    try {
      const parsed = new URL(docUrl);
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts.length > 1) {
        const rootPath = `${parsed.origin}/${pathParts[0]}`;
        if (!candidateUrls.has(rootPath) && rootPath !== targetUrl) {
          candidateUrls.set(rootPath, capitalize(pathParts[0].replace(/[-_]/g, " ")) + " (overview)");
        }
      }
    } catch { /* skip malformed */ }
  }

  // Then add discovered links (actual links from the site)
  for (const { url, label } of discoveredUrls) {
    if (!candidateUrls.has(url)) {
      candidateUrls.set(url, label);
    }
  }

  // Only try fallback paths if we didn't find enough real links from the homepage.
  // When the homepage already links to docs, blindly probing /docs, /api, /sdk etc.
  // wastes crawl credits and often hits soft-404 pages.
  const hasEnoughDiscoveredLinks = discoveredUrls.length >= 2;

  if (!hasEnoughDiscoveredLinks) {
    // Fallback: try common paths on same origin
    for (const path of DISCOVERY_PATHS) {
      const pageUrl = `${origin}${path}`;
      if (!candidateUrls.has(pageUrl) && pageUrl !== targetUrl) {
        candidateUrls.set(pageUrl, capitalize(path.slice(1).replace(/[-_]/g, " ")));
      }
    }
  }

  // Always try doc subdomains — they're high-value and only 3 requests max
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

  // Track content fingerprints to detect soft 404s (sites that return the same
  // shell page for every unknown path). Use the first 500 chars as a fingerprint.
  const seenFingerprints = new Set<string>();
  if (homepage.status === "success") {
    seenFingerprints.add(homepage.content.slice(0, 500));
  }

  for (let i = 0; i < candidates.length; i += batchSize) {
    if (totalChars >= MAX_CONTENT_LENGTH) break;

    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(([url, label]) => crawlPage(url, label))
    );

    for (const page of results) {
      if (totalChars >= MAX_CONTENT_LENGTH) {
        if (page.status === "success") {
          page.status = "skipped";
          page.content = "";
          page.error = "Content cap reached";
        }
        pages.push(page);
        continue;
      }

      if (page.status === "success") {
        // Detect soft 404s: if this page's content fingerprint matches a
        // previously seen page, it's likely the same shell/redirect page
        const fingerprint = page.content.slice(0, 500);
        if (seenFingerprints.has(fingerprint)) {
          page.status = "skipped";
          page.content = "";
          page.error = "Duplicate content (likely soft 404)";
          pages.push(page);
          continue;
        }
        seenFingerprints.add(fingerprint);

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

  // Also extract doc links from all successfully crawled pages (not just homepage)
  for (const page of pages) {
    if (page.status === "success" && page.url !== targetUrl) {
      const extraLinks = extractDocUrls(page.content, origin, rootDomain);
      for (const link of extraLinks) {
        if (!allDiscoveredDocLinks.some((d) => d.url === link.url)) {
          allDiscoveredDocLinks.push(link);
        }
      }
    }
  }

  return {
    pages,
    totalTokensEstimate: Math.ceil(totalChars / 4),
    discoveredDocLinks: allDiscoveredDocLinks,
  };
}

/**
 * Check if a URL's hostname matches a known third-party doc platform.
 */
function isKnownDocPlatform(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return KNOWN_DOC_PLATFORMS.some(
      (platform) => hostname === platform || hostname.endsWith(`.${platform}`)
    );
  } catch {
    return false;
  }
}

/**
 * Determine if a URL should be treated as a documentation link.
 * Accepts URLs that are: (doc-pattern AND same-domain) OR on a known doc platform.
 */
function isRelevantDocUrl(
  url: string,
  rootDomain: string | null
): boolean {
  const isDocUrl = DOC_URL_PATTERNS.some((pattern) => pattern.test(url));
  const isSameDomain = rootDomain != null && url.includes(rootDomain);

  // Same-domain doc URL
  if (isDocUrl && isSameDomain) return true;

  // Third-party doc platform (e.g., acme.readme.io, acme.gitbook.io)
  if (isKnownDocPlatform(url)) return true;

  return false;
}

/**
 * Extract URLs from crawled content that look like documentation pages.
 * Crawled content is markdown with [text](url) links.
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

    if (seen.has(url)) continue;

    if (isRelevantDocUrl(url, rootDomain)) {
      seen.add(url);
      found.push({ url, label: label.slice(0, 50) });
    }
  }

  // Match bare href="url" patterns (Jina sometimes preserves these)
  const hrefRegex = /href=["'](https?:\/\/[^"']+)["']/g;
  while ((match = hrefRegex.exec(content)) !== null) {
    const url = match[1];
    if (seen.has(url)) continue;

    if (isRelevantDocUrl(url, rootDomain)) {
      seen.add(url);
      found.push({ url, label: labelFromUrl(url) });
    }
  }

  // Also look for plain URLs that match doc patterns
  const plainUrlRegex = /https?:\/\/[^\s)<>"']+/g;
  while ((match = plainUrlRegex.exec(content)) !== null) {
    const url = match[0];
    if (seen.has(url)) continue;

    if (isRelevantDocUrl(url, rootDomain)) {
      seen.add(url);
      found.push({ url, label: labelFromUrl(url) });
    }
  }

  // Limit to 12 discovered URLs
  return found.slice(0, 12);
}

/**
 * Generate a human-readable label from a URL path.
 */
function labelFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // For third-party platforms, include the platform name
    if (isKnownDocPlatform(url)) {
      const platformName = KNOWN_DOC_PLATFORMS.find(
        (p) => parsed.hostname === p || parsed.hostname.endsWith(`.${p}`)
      );
      const path = parsed.pathname.slice(1).split("/")[0];
      return path
        ? capitalize(path.replace(/[-_]/g, " "))
        : `Docs (${platformName})`;
    }
    const path = parsed.pathname;
    return capitalize(path.slice(1).split("/")[0].replace(/[-_]/g, " ")) || "Docs";
  } catch {
    return "Docs";
  }
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
  const tabstackKey = process.env.TABSTACK_API_KEY;

  // Try Tabstack first if API key is available
  if (tabstackKey) {
    const result = await crawlWithTabstack(url, label, tabstackKey);
    if (result.status === "success") return result;
    // Fall through to Jina on failure
  }

  return crawlWithJina(url, label);
}

async function crawlWithTabstack(
  url: string,
  label: string,
  apiKey: string
): Promise<CrawledPage> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);

    const response = await fetch(TABSTACK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { url, label, content: "", status: "failed", error: `Tabstack HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = typeof data.markdown === "string"
      ? data.markdown
      : typeof data.content === "string"
        ? data.content
        : typeof data === "string"
          ? data
          : JSON.stringify(data);

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
      error: `Tabstack: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

async function crawlWithJina(url: string, label: string): Promise<CrawledPage> {
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
