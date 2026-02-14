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

// ── Sync Back ─────────────────────────────────────────────────

export interface FolkSyncData {
  githubUrl?: string | null;
  twitterUrl?: string | null;
  websiteUrl?: string | null;
  personalEmail?: string | null;
  seniority?: string | null;
  languages?: string | null;
  roleType?: string | null;
  yearsExperience?: number | null;
  location?: string | null;
  frameworks?: string | null;
  databases?: string | null;
  industries?: string | null;
}

/**
 * Sync enriched developer data back to a Folk CRM contact.
 * Updates both standard fields (urls) and custom fields in the group.
 */
export async function updateFolkPerson(
  folkPersonId: string,
  folkGroupId: string,
  data: FolkSyncData
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.FOLK_API_KEY;
  if (!key) return { ok: false, error: "FOLK_API_KEY not set" };

  // Build custom fields for the group
  const customFields: Record<string, unknown> = {};
  if (data.seniority) customFields["Seniority level"] = data.seniority;
  if (data.roleType) customFields["Role type"] = data.roleType;
  if (data.languages) {
    customFields["Primary programming languages"] = data.languages
      .split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (data.frameworks) {
    customFields["Frameworks"] = data.frameworks
      .split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (data.databases) {
    customFields["Databases"] = data.databases
      .split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (data.industries) {
    customFields["Industries"] = data.industries
      .split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (data.yearsExperience) {
    customFields["Years of professional experience"] = data.yearsExperience;
  }
  if (data.location) customFields["Location"] = data.location;

  // Build the PATCH body
  // Note: urls replaces the entire array, so we first fetch existing urls to merge
  const body: Record<string, unknown> = {};

  if (Object.keys(customFields).length > 0) {
    body.customFieldValues = { [folkGroupId]: customFields };
  }

  // Collect new URLs and emails to merge
  const newUrls: string[] = [];
  if (data.githubUrl) newUrls.push(data.githubUrl);
  if (data.twitterUrl) newUrls.push(data.twitterUrl);
  if (data.websiteUrl) newUrls.push(data.websiteUrl);

  // Folk PATCH replaces list fields entirely, so fetch existing to merge
  if (newUrls.length > 0 || data.personalEmail) {
    try {
      const getRes = await fetch(`${FOLK_BASE}/people/${folkPersonId}`, {
        headers: folkHeaders(),
      });
      if (getRes.ok) {
        const person = await getRes.json();
        if (newUrls.length > 0) {
          const existingUrls: string[] = person.data?.urls ?? [];
          body.urls = [...new Set([...existingUrls, ...newUrls])];
        }
        if (data.personalEmail) {
          const existingEmails: string[] = person.data?.emails ?? [];
          if (!existingEmails.includes(data.personalEmail)) {
            body.emails = [...existingEmails, data.personalEmail];
          }
        }
      } else if (newUrls.length > 0) {
        body.urls = newUrls;
      }
    } catch {
      if (newUrls.length > 0) body.urls = newUrls;
    }
  }

  if (Object.keys(body).length === 0) {
    return { ok: true };
  }

  const res = await fetch(`${FOLK_BASE}/people/${folkPersonId}`, {
    method: "PATCH",
    headers: folkHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 422 && text.includes("does not exist in group")) {
      console.warn(`Folk sync-back: custom fields missing in group ${folkGroupId} — skipping`);
      return { ok: false, error: "Folk group missing custom fields" };
    }
    return { ok: false, error: `Folk PATCH failed (${res.status}): ${text}` };
  }

  return { ok: true };
}
