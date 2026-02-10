import type { CrawledPage, CrawlResult } from "./types";

const JINA_PREFIX = "https://r.jina.ai/";
const MAX_CONTENT_LENGTH = 15000;
const CRAWL_TIMEOUT_MS = 15000;

const DISCOVERY_PATHS = [
  "/docs",
  "/documentation",
  "/api",
  "/pricing",
  "/getting-started",
  "/quickstart",
];

export async function crawlTarget(targetUrl: string): Promise<CrawlResult> {
  const pages: CrawledPage[] = [];
  let totalChars = 0;

  // 1. Crawl the submitted URL (required)
  const homepage = await crawlPage(targetUrl, "Homepage");
  pages.push(homepage);
  if (homepage.status === "success") {
    totalChars += homepage.content.length;
  }

  // 2. Attempt common paths
  const origin = new URL(targetUrl).origin;

  for (const path of DISCOVERY_PATHS) {
    if (totalChars >= MAX_CONTENT_LENGTH) break;

    const pageUrl = `${origin}${path}`;
    const label = capitalize(path.slice(1).replace("-", " "));
    const page = await crawlPage(pageUrl, label);

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

  return {
    pages,
    totalTokensEstimate: Math.ceil(totalChars / 4),
  };
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
