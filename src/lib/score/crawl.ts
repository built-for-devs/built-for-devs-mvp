import type { CrawledPage, CrawlResult } from "./types";

const TABSTACK_API_URL = "https://api.tabstack.ai/v1/extract/markdown";
const JINA_PREFIX = "https://r.jina.ai/";
const MAX_CONTENT_LENGTH = 80000;
const MAX_HOMEPAGE_LENGTH = 15000;
const CRAWL_TIMEOUT_MS = 20000;

// Max pages to crawl beyond the homepage. Keeps credit usage to ~7 calls.
const MAX_CANDIDATES = 6;

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

// Patterns that indicate a URL is documentation-related (high priority)
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

// Non-doc pages that are still useful for scoring (pricing, changelog, etc.)
const SCORING_URL_PATTERNS = [
  /\/pricing/i,
  /\/integrations/i,
  /\/changelog/i,
  /\/releases/i,
  /\/community/i,
];

export async function crawlTarget(targetUrl: string): Promise<CrawlResult> {
  const pages: CrawledPage[] = [];
  let totalChars = 0;

  const parsedUrl = new URL(targetUrl);
  const origin = parsedUrl.origin;
  const rootDomain = getRootDomain(parsedUrl.hostname);

  // 1. Crawl the homepage (always required)
  const homepage = await crawlPage(targetUrl, "Homepage");

  // 2. Extract ALL links from full homepage content BEFORE truncation.
  //    We ONLY crawl pages that are actually linked — no speculative guessing.
  const allLinks =
    homepage.status === "success"
      ? extractSiteLinks(homepage.content, origin, rootDomain)
      : [];

  // Track doc links for the prompt (even ones we don't end up crawling)
  const allDiscoveredDocLinks = allLinks
    .filter((l) => l.isDoc)
    .map(({ url, label }) => ({ url, label }));

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

  // 3. Build candidate URLs from discovered links only — no guessing
  const candidateUrls = new Map<string, string>(); // url -> label

  const docLinks = allLinks.filter((l) => l.isDoc);
  const scoringLinks = allLinks.filter(
    (l) => !l.isDoc && SCORING_URL_PATTERNS.some((p) => p.test(l.url))
  );

  // a) Derive doc root pages from deep doc links (highest priority)
  //    e.g., if we found docs.example.com/api/auth, also try docs.example.com
  for (const { url: docUrl } of docLinks) {
    try {
      const parsed = new URL(docUrl);
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (pathParts.length > 1) {
        const rootPath = `${parsed.origin}/${pathParts[0]}`;
        if (!candidateUrls.has(rootPath) && rootPath !== targetUrl) {
          candidateUrls.set(
            rootPath,
            capitalize(pathParts[0].replace(/[-_]/g, " ")) + " (overview)"
          );
        }
      }
      // If doc URL is on a different origin (e.g., docs.example.com/deep/page),
      // also try the origin root (docs.example.com)
      if (parsed.origin !== origin && parsed.pathname !== "/") {
        const originRoot = parsed.origin;
        if (!candidateUrls.has(originRoot) && originRoot !== targetUrl) {
          candidateUrls.set(originRoot, `${parsed.hostname} (root)`);
        }
      }
    } catch {
      /* skip malformed */
    }
  }

  // b) Add discovered doc links
  for (const { url, label } of docLinks) {
    if (!candidateUrls.has(url) && url !== targetUrl) {
      candidateUrls.set(url, label);
    }
  }

  // c) Add scoring-relevant non-doc pages (pricing, changelog, etc.)
  for (const { url, label } of scoringLinks) {
    if (!candidateUrls.has(url) && url !== targetUrl) {
      candidateUrls.set(url, label);
    }
  }

  // d) If NO doc links were found on the homepage at all, try docs.domain.com
  //    as a single fallback — many products host docs on a subdomain that
  //    isn't explicitly linked from the main site navigation.
  if (docLinks.length === 0 && rootDomain) {
    const docsSubUrl = `https://docs.${rootDomain}`;
    if (!candidateUrls.has(docsSubUrl) && docsSubUrl !== targetUrl) {
      candidateUrls.set(docsSubUrl, "Docs subdomain");
    }
  }

  // 4. Crawl candidates (capped, in parallel batches of 5)
  const candidates = Array.from(candidateUrls.entries()).slice(
    0,
    MAX_CANDIDATES
  );
  const batchSize = 5;

  // Track content fingerprints to detect soft 404s
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
      const extraLinks = extractSiteLinks(page.content, origin, rootDomain);
      for (const link of extraLinks) {
        if (
          link.isDoc &&
          !allDiscoveredDocLinks.some((d) => d.url === link.url)
        ) {
          allDiscoveredDocLinks.push({ url: link.url, label: link.label });
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

// ---------------------------------------------------------------------------
// Link extraction — finds ALL links in crawled content (absolute + relative)
// ---------------------------------------------------------------------------

interface SiteLink {
  url: string;
  label: string;
  isDoc: boolean;
}

/**
 * Extract all same-domain and doc-platform links from crawled markdown content.
 * Handles absolute URLs, relative URLs, markdown links, and bare href attributes.
 */
function extractSiteLinks(
  content: string,
  origin: string,
  rootDomain: string | null
): SiteLink[] {
  const found: SiteLink[] = [];
  const seen = new Set<string>();

  function tryAdd(rawUrl: string, rawLabel: string) {
    let url = rawUrl.trim();

    // Resolve relative URLs against the page origin
    if (url.startsWith("/")) {
      url = `${origin}${url}`;
    }

    // Skip non-http URLs (mailto:, tel:, #anchors, javascript:, etc.)
    if (!url.startsWith("http")) return;

    // Normalize: remove fragment, trailing slash
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      url = parsed.toString().replace(/\/$/, "");
    } catch {
      return;
    }

    if (seen.has(url)) return;

    // Only keep same-domain links or known doc platforms
    const isSameDomain = rootDomain != null && url.includes(rootDomain);
    const isDocPlatform = isKnownDocPlatform(url);
    if (!isSameDomain && !isDocPlatform) return;

    seen.add(url);

    const isDoc =
      DOC_URL_PATTERNS.some((p) => p.test(url)) || isDocPlatform;
    const label = rawLabel.slice(0, 50).trim() || labelFromUrl(url);
    found.push({ url, label, isDoc });
  }

  // 1. Markdown links: [label](url) — most common in Tabstack/Jina output
  const mdLinkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    tryAdd(match[2], match[1]);
  }

  // 2. Bare href attributes: href="url" (sometimes preserved by extractors)
  const hrefRegex = /href=["']([^"']+)["']/g;
  while ((match = hrefRegex.exec(content)) !== null) {
    tryAdd(match[1], "");
  }

  // 3. Plain URLs that match doc patterns (catch URLs in text without markup)
  const plainUrlRegex = /https?:\/\/[^\s)<>"']+/g;
  while ((match = plainUrlRegex.exec(content)) !== null) {
    const url = match[0];
    // Only add plain URLs if they look doc-related (avoid noise from every link)
    if (
      DOC_URL_PATTERNS.some((p) => p.test(url)) ||
      isKnownDocPlatform(url)
    ) {
      tryAdd(url, "");
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function labelFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
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
    return (
      capitalize(path.slice(1).split("/")[0].replace(/[-_]/g, " ")) || "Docs"
    );
  } catch {
    return "Docs";
  }
}

function getRootDomain(hostname: string): string | null {
  const parts = hostname.split(".");
  if (parts.length < 2) return null;
  return parts.slice(-2).join(".");
}

async function crawlPage(url: string, label: string): Promise<CrawledPage> {
  const tabstackKey = process.env.TABSTACK_API_KEY;

  if (tabstackKey) {
    const result = await crawlWithTabstack(url, label, tabstackKey);
    if (result.status === "success") return result;
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
      return {
        url,
        label,
        content: "",
        status: "failed",
        error: `Tabstack HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const content =
      typeof data.markdown === "string"
        ? data.markdown
        : typeof data.content === "string"
          ? data.content
          : typeof data === "string"
            ? data
            : JSON.stringify(data);

    if (content.length < 100) {
      return {
        url,
        label,
        content: "",
        status: "skipped",
        error: "Content too short (likely 404)",
      };
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

async function crawlWithJina(
  url: string,
  label: string
): Promise<CrawledPage> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);

    const response = await fetch(`${JINA_PREFIX}${url}`, {
      headers: { Accept: "text/plain" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        url,
        label,
        content: "",
        status: "failed",
        error: `HTTP ${response.status}`,
      };
    }

    const content = await response.text();

    if (content.length < 100) {
      return {
        url,
        label,
        content: "",
        status: "skipped",
        error: "Content too short (likely 404)",
      };
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
