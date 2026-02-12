/**
 * Server-side contact enrichment via web search + AI extraction.
 *
 * 1. Serper.dev searches the web for the person
 * 2. Claude extracts structured enrichment data from results
 * 3. Results are written back to Folk CRM
 */

import Anthropic from "@anthropic-ai/sdk";

// ── Types ──────────────────────────────────────────────────────

export interface EnrichmentInput {
  folkId: string;
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  jobTitle?: string | null;
  company?: string | null;
}

export interface EnrichmentResult {
  folkId: string;
  name: string;
  status: "enriched" | "partial" | "failed";
  data?: EnrichmentData;
  error?: string;
}

export interface EnrichmentData {
  seniority: string | null;
  roleType: string | null;
  languages: string | null;
  yearsExperience: string | null;
  location: string | null;
  city: string | null;
  stateRegion: string | null;
  country: string | null;
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

// ── Serper Search ──────────────────────────────────────────────

async function searchPerson(input: EnrichmentInput): Promise<string> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY not set");

  // Build a targeted search query
  const parts: string[] = [];
  if (input.name) parts.push(`"${input.name}"`);
  if (input.company) parts.push(input.company);
  parts.push("developer OR engineer OR software");

  const query = parts.join(" ");

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 10 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const results: SerperResult[] = data.organic ?? [];

  // Also search specifically for their LinkedIn if we have the URL
  // (the public preview often has great structured data)
  let linkedinSnippet = "";
  if (input.linkedinUrl) {
    const linkedinResult = results.find((r) =>
      r.link.includes("linkedin.com")
    );
    if (linkedinResult) {
      linkedinSnippet = `LinkedIn: ${linkedinResult.title} — ${linkedinResult.snippet}`;
    }
  }

  // Format results as text for Claude
  const formatted = results
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] ${r.title}\n    ${r.link}\n    ${r.snippet}`)
    .join("\n\n");

  return [
    linkedinSnippet ? `${linkedinSnippet}\n\n` : "",
    `Search results for: ${query}\n\n`,
    formatted,
  ].join("");
}

// ── Claude Extraction ──────────────────────────────────────────

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not set");
    anthropicClient = new Anthropic({ apiKey: key });
  }
  return anthropicClient;
}

async function extractWithClaude(
  searchText: string,
  input: EnrichmentInput
): Promise<EnrichmentData> {
  const client = getAnthropic();

  const knownInfo = [
    `Name: ${input.name}`,
    input.email ? `Email: ${input.email}` : null,
    input.jobTitle ? `Current title: ${input.jobTitle}` : null,
    input.company ? `Current company: ${input.company}` : null,
    input.linkedinUrl ? `LinkedIn: ${input.linkedinUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are extracting structured developer profile data from web search results.

Known information about this person:
${knownInfo}

Web search results:
${searchText}

Based on ALL available information (both known info and search results), extract the following fields. Use the search results to fill gaps and verify known info. If you can't determine a field, use null.

Respond with ONLY a JSON object, no markdown:
{
  "seniority": "leadership" | "senior" | "early_career" | null,
  "roleType": "full-stack" | "frontend" | "backend" | "mobile" | "devops" | "data-engineer" | null,
  "languages": "comma-separated list of programming languages" | null,
  "yearsExperience": "number as string" | null,
  "city": "city name" | null,
  "stateRegion": "state or region name (full name, not abbreviation)" | null,
  "country": "country name" | null
}

Rules for seniority (ONLY these 3 values are valid):
- "leadership": VP, Director, Head of, CTO, CEO, Chief, Founder, Co-founder
- "senior": Senior, Staff, Principal, Lead, Architect, mid-level with 5+ years
- "early_career": Junior, Intern, Associate, Entry-level, Graduate, mid-level with <5 years

Rules for roleType: infer from job titles, skills, and technologies mentioned.
Rules for languages: list actual programming languages (JavaScript, Python, etc.), not frameworks.
Rules for yearsExperience: estimate from career history if visible.
Rules for location: split into separate city, stateRegion, and country fields. For US locations use full state name (e.g. "Tennessee" not "TN"). Always include country (e.g. "United States", "Canada", "United Kingdom").`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    // Handle potential markdown code blocks
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    // Build composite location for Folk (which uses a single field)
    const locationParts = [
      parsed.city,
      parsed.stateRegion,
      parsed.country,
    ].filter(Boolean);

    return {
      seniority: parsed.seniority ?? null,
      roleType: parsed.roleType ?? null,
      languages: parsed.languages ?? null,
      yearsExperience: parsed.yearsExperience ?? null,
      location: locationParts.length > 0 ? locationParts.join(", ") : null,
      city: parsed.city ?? null,
      stateRegion: parsed.stateRegion ?? null,
      country: parsed.country ?? null,
    };
  } catch {
    console.error("Failed to parse Claude response:", text);
    return {
      seniority: null,
      roleType: null,
      languages: null,
      yearsExperience: null,
      location: null,
      city: null,
      stateRegion: null,
      country: null,
    };
  }
}

// ── Folk Update ────────────────────────────────────────────────

async function updateFolk(
  folkId: string,
  groupId: string,
  data: EnrichmentData
): Promise<{ ok: boolean; warning?: string }> {
  const key = process.env.FOLK_API_KEY;
  if (!key) throw new Error("FOLK_API_KEY not set");

  const customFields: Record<string, unknown> = {};
  if (data.seniority) customFields["Seniority level"] = data.seniority;
  if (data.roleType) customFields["Role type"] = data.roleType;
  if (data.languages) {
    customFields["Primary programming languages"] = data.languages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
  }
  if (data.yearsExperience) {
    customFields["Years of professional experience"] = Number(data.yearsExperience);
  }
  if (data.location) customFields["Location"] = data.location;

  if (Object.keys(customFields).length === 0) {
    return { ok: true };
  }

  const res = await fetch(`https://api.folk.app/v1/people/${folkId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customFieldValues: { [groupId]: customFields },
    }),
  });

  if (!res.ok) {
    const text = await res.text();

    // If the group doesn't have these custom fields, don't fail the whole enrichment.
    // The data will still be synced to BFD.
    if (res.status === 422 && text.includes("does not exist in group")) {
      console.warn(`Folk custom fields not available in group ${groupId} — skipping Folk update for ${folkId}`);
      return { ok: false, warning: "Folk group missing custom fields — data saved to BFD only" };
    }

    throw new Error(`Folk PATCH failed (${res.status}): ${text}`);
  }

  return { ok: true };
}

// ── Public API ─────────────────────────────────────────────────

export async function enrichContact(
  input: EnrichmentInput,
  groupId: string
): Promise<EnrichmentResult> {
  try {
    // 1. Search the web
    const searchText = await searchPerson(input);

    // 2. Extract with Claude
    const data = await extractWithClaude(searchText, input);

    // 3. Count how many fields we got
    const filled = Object.values(data).filter((v) => v != null).length;

    if (filled === 0) {
      return { folkId: input.folkId, name: input.name, status: "failed", error: "No data found" };
    }

    // 4. Write to Folk (non-fatal if group lacks custom fields)
    const folkResult = await updateFolk(input.folkId, groupId, data);

    return {
      folkId: input.folkId,
      name: input.name,
      status: filled >= 3 ? "enriched" : "partial",
      data,
      ...(folkResult.warning ? { error: folkResult.warning } : {}),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { folkId: input.folkId, name: input.name, status: "failed", error: message };
  }
}
