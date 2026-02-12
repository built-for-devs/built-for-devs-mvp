/**
 * Folk CRM API client — server-only.
 * Docs: https://developer.folk.app/api-reference
 */

const FOLK_BASE = "https://api.folk.app/v1";

function folkHeaders(): HeadersInit {
  const key = process.env.FOLK_API_KEY;
  if (!key) throw new Error("FOLK_API_KEY is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// ── Types ──────────────────────────────────────────────────────

export interface FolkGroup {
  id: string;
  name: string;
}

export interface FolkPerson {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  emails: string[];
  phones: string[];
  urls: string[];
  jobTitle: string | null;
  companies: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  customFieldValues: Record<string, Record<string, unknown>>;
}

export interface FolkContactView {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  linkedinUrl: string | null;
  jobTitle: string | null;
  company: string | null;
  enrichmentStatus: "enriched" | "partial" | "not_enriched";
  enrichmentData: Record<string, string | null>;
}

// Folk's existing custom field names (already set up in the workspace)
export const ENRICHMENT_FIELDS = [
  "Seniority level",
  "Primary programming languages",
  "Role type",
  "Years of professional experience",
  "Location",
] as const;

// ── API Functions ──────────────────────────────────────────────

export async function getFolkGroups(): Promise<FolkGroup[]> {
  const groups: FolkGroup[] = [];
  let nextUrl: string | null = `${FOLK_BASE}/groups?limit=100`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, { headers: folkHeaders() });
    if (!res.ok) throw new Error(`Folk API error: ${res.status}`);
    const json = await res.json();
    groups.push(...json.data.items);
    nextUrl = json.data.pagination?.nextLink ?? null;
  }

  return groups;
}

export async function getFolkPeople(
  groupId: string,
  limit: number = 10,
  cursor?: string
): Promise<{ items: FolkPerson[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  params.set("filter[groups][in][id]", groupId);
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${FOLK_BASE}/people?${params}`, {
    headers: folkHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Folk API error ${res.status}: ${text}`);
  }
  const json = await res.json();

  return {
    items: json.data.items,
    nextCursor: json.data.pagination?.nextLink
      ? new URL(json.data.pagination.nextLink).searchParams.get("cursor")
      : null,
  };
}

// ── Helper Functions ───────────────────────────────────────────

export function extractLinkedinUrl(
  person: FolkPerson,
  groupId: string
): string | null {
  // First check the custom field (Folk enrichment populates this)
  const groupFields = person.customFieldValues?.[groupId];
  const customLinkedin = groupFields?.["LinkedIn URL"];
  if (customLinkedin && typeof customLinkedin === "string") {
    return customLinkedin;
  }

  // Fallback to urls array
  if (person.urls) {
    const linked = person.urls.find((u) =>
      u.toLowerCase().includes("linkedin.com")
    );
    if (linked) {
      // Ensure it has https://
      return linked.startsWith("http") ? linked : `https://${linked}`;
    }
  }

  return null;
}

export function getEnrichmentStatus(
  person: FolkPerson,
  groupId: string
): "enriched" | "partial" | "not_enriched" {
  const groupFields = person.customFieldValues?.[groupId];
  if (!groupFields) return "not_enriched";

  const filled = ENRICHMENT_FIELDS.filter((f) => {
    const val = groupFields[f];
    if (val == null) return false;
    if (typeof val === "string" && val === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }).length;

  if (filled === 0) return "not_enriched";
  if (filled >= 3) return "enriched";
  return "partial";
}

export function toContactView(
  person: FolkPerson,
  groupId: string
): FolkContactView {
  const groupFields = person.customFieldValues?.[groupId] ?? {};

  const enrichmentData: Record<string, string | null> = {};
  for (const field of ENRICHMENT_FIELDS) {
    const val = groupFields[field];
    if (val == null) {
      enrichmentData[field] = null;
    } else if (Array.isArray(val)) {
      enrichmentData[field] = val.length > 0 ? val.join(", ") : null;
    } else {
      enrichmentData[field] = String(val) || null;
    }
  }

  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    fullName: person.fullName,
    email: person.emails?.[0] ?? null,
    linkedinUrl: extractLinkedinUrl(person, groupId),
    jobTitle: person.jobTitle,
    company: person.companies?.[0]?.name ?? null,
    enrichmentStatus: getEnrichmentStatus(person, groupId),
    enrichmentData,
  };
}
