/**
 * AgentQL LinkedIn scraping via authenticated remote browser sessions.
 *
 * Uses AgentQL's Remote Browser Sessions API to spin up a stealth browser
 * on AgentQL's infrastructure, injects the admin's LinkedIn session cookie,
 * navigates to the profile, and extracts the rendered page text.
 *
 * The raw text is stored in the DB for future re-processing, then Claude
 * extracts structured developer fields from it.
 *
 * Env vars required:
 *   AGENTQL_API_KEY   — AgentQL API key
 *   LINKEDIN_LI_AT    — LinkedIn li_at session cookie value
 *
 * Rate limiting: caller is responsible for spacing requests (10s+ between calls)
 * to avoid LinkedIn anti-detection.
 */

import { chromium } from "playwright-core";

let apiKey: string | null = null;

function getApiKey(): string {
  if (!apiKey) {
    apiKey = process.env.AGENTQL_API_KEY ?? null;
    if (!apiKey) throw new Error("AGENTQL_API_KEY is not set");
  }
  return apiKey;
}

function getLinkedInCookie(): string {
  const cookie = process.env.LINKEDIN_LI_AT;
  if (!cookie) throw new Error("LINKEDIN_LI_AT environment variable is not set — admin must provide their LinkedIn session cookie");
  return cookie;
}

// ── Remote browser session management ──

interface RemoteSession {
  session_id: string;
  cdp_url: string;
}

async function createRemoteSession(): Promise<RemoteSession> {
  const key = getApiKey();

  const res = await fetch("https://api.agentql.com/v1/tetra/sessions", {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      browser_profile: "stealth",
      proxy: { type: "tetra", country_code: "us" },
      inactivity_timeout_seconds: 120,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to create remote browser session: ${res.status} ${text}`);
  }

  return res.json();
}

async function closeRemoteSession(sessionId: string): Promise<void> {
  const key = getApiKey();
  await fetch(`https://api.agentql.com/v1/tetra/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { "X-API-Key": key },
  }).catch(() => {}); // Best-effort cleanup
}

// ── LinkedIn profile scraping ──

export interface LinkedInScrapedResult {
  /** The rendered page text content */
  text: string;
  /** The LinkedIn URL that was scraped */
  url: string;
  /** ISO timestamp of when the scrape occurred */
  scraped_at: string;
}

/**
 * Scrape a LinkedIn profile using an authenticated remote browser session.
 *
 * Flow:
 * 1. Create AgentQL remote browser (stealth + US proxy)
 * 2. Inject LinkedIn li_at session cookie
 * 3. Navigate to the profile URL
 * 4. Wait for content to render
 * 5. Extract clean text content (no scripts/styles)
 * 6. Close session
 *
 * Returns the rendered page text for Claude extraction.
 * Throws on auth failure, timeout, or scrape errors.
 */
export async function scrapeLinkedInProfile(
  linkedinUrl: string
): Promise<LinkedInScrapedResult> {
  const liAtCookie = getLinkedInCookie();
  let session: RemoteSession | null = null;
  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;

  try {
    // 1. Create remote browser session on AgentQL infrastructure
    session = await createRemoteSession();
    console.log(`[AgentQL] Created remote session ${session.session_id}`);

    // 2. Connect via Chrome DevTools Protocol (WebSocket — no local browser needed)
    browser = await chromium.connectOverCDP(session.cdp_url, {
      timeout: 30_000,
    });

    // Get the default context (remote browsers come with one)
    const context = browser.contexts()[0] ?? await browser.newContext();

    // 3. Inject LinkedIn session cookie
    await context.addCookies([
      {
        name: "li_at",
        value: liAtCookie,
        domain: ".linkedin.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
    ]);

    // 4. Navigate to profile
    const page = await context.newPage();
    await page.goto(linkedinUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Wait for dynamic content to render
    await page.waitForTimeout(5000);

    // 5. Check if we got redirected to login (cookie expired/invalid)
    const currentUrl = page.url();
    if (
      currentUrl.includes("/login") ||
      currentUrl.includes("/authwall") ||
      currentUrl.includes("/checkpoint")
    ) {
      throw new Error(
        "LinkedIn authentication failed — li_at cookie may be expired. " +
        "Please update the LINKEDIN_LI_AT environment variable with a fresh cookie."
      );
    }

    // 6. Scroll down to load lazy content (experience descriptions, skills)
    await page.evaluate(async () => {
      const scrollStep = 800;
      const delay = 300;
      let scrolled = 0;
      const maxScroll = document.body.scrollHeight;

      while (scrolled < maxScroll) {
        window.scrollBy(0, scrollStep);
        scrolled += scrollStep;
        await new Promise((r) => setTimeout(r, delay));
      }
      // Scroll back to top
      window.scrollTo(0, 0);
    });

    // Wait a bit more after scrolling for any lazy-loaded content
    await page.waitForTimeout(2000);

    // 7. Extract clean text content
    const pageText = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      // Remove noise elements
      clone
        .querySelectorAll(
          "script, style, noscript, nav, footer, [role='navigation'], " +
          "[role='banner'], [role='contentinfo'], .global-nav, .msg-overlay-list-bubble"
        )
        .forEach((el) => el.remove());
      return clone.innerText.trim();
    });

    if (!pageText || pageText.length < 100) {
      throw new Error(
        "LinkedIn page returned very little text content — the profile may not have loaded correctly"
      );
    }

    console.log(
      `[AgentQL] Scraped ${linkedinUrl}: ${pageText.length} chars of text`
    );

    return {
      text: pageText,
      url: linkedinUrl,
      scraped_at: new Date().toISOString(),
    };
  } finally {
    // Always clean up
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (session) {
      await closeRemoteSession(session.session_id);
      console.log(`[AgentQL] Closed remote session ${session.session_id}`);
    }
  }
}
