/**
 * SixtyFour.ai API client for deep lead enrichment.
 * Used as the last automated step in the GitHub discovery cascade —
 * finds GitHub profiles from LinkedIn and other data when cheaper methods fail.
 *
 * Uses the async API because enrichment takes ~5 minutes (P95).
 * Flow: submitGitHubDiscovery() → poll with pollGitHubDiscovery() until complete.
 */

let apiKey: string | null = null;

function getApiKey(): string {
  if (!apiKey) {
    apiKey = process.env.SIXTYFOUR_API_KEY ?? null;
    if (!apiKey) throw new Error("SIXTYFOUR_API_KEY is not set");
  }
  return apiKey;
}

export interface SixtyFourInput {
  name: string;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  linkedin?: string | null;
}

export interface SixtyFourResult {
  taskId: string;
  status: "pending" | "processing" | "completed" | "failed";
  githubUrl?: string | null;
  personalEmail?: string | null;
  twitterUrl?: string | null;
  websiteUrl?: string | null;
  confidenceScore?: number;
}

/**
 * Submit an async GitHub discovery job to SixtyFour.
 * Returns the task ID for polling.
 */
export async function submitGitHubDiscovery(
  input: SixtyFourInput
): Promise<string> {
  const key = getApiKey();

  const leadInfo: Record<string, string> = { name: input.name };
  if (input.title) leadInfo.title = input.title;
  if (input.company) leadInfo.company = input.company;
  if (input.location) leadInfo.location = input.location;
  if (input.linkedin) leadInfo.linkedin = input.linkedin;

  const res = await fetch("https://api.sixtyfour.ai/enrich-lead-async", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lead_info: leadInfo,
      struct: {
        github_url: "url for their github profile",
        personal_email: "their personal email address (gmail, hey, proton, etc — not work email)",
        twitter_url: "url for their twitter/x profile",
        website_url: "url for their personal website or blog",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SixtyFour submit failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.task_id;
}

/**
 * Poll a SixtyFour async job for completion.
 * Returns the current status and GitHub URL if found.
 */
export async function pollGitHubDiscovery(
  taskId: string
): Promise<SixtyFourResult> {
  const key = getApiKey();

  const res = await fetch(`https://api.sixtyfour.ai/job-status/${taskId}`, {
    headers: {
      "x-api-key": key,
    },
  });

  if (!res.ok) {
    return { taskId, status: "failed" };
  }

  const data = await res.json();
  const status = data.status as string;

  if (status === "completed") {
    const sd = data.structured_data ?? {};
    return {
      taskId,
      status: "completed",
      githubUrl: sd.github_url || null,
      personalEmail: sd.personal_email || null,
      twitterUrl: sd.twitter_url || null,
      websiteUrl: sd.website_url || null,
      confidenceScore: data.confidence_score,
    };
  }

  if (status === "failed") {
    return { taskId, status: "failed" };
  }

  // pending or processing
  return { taskId, status: status === "processing" ? "processing" : "pending" };
}
