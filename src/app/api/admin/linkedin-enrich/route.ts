import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { scrapeLinkedInProfile, type LinkedInRawProfile } from "@/lib/agentql";
import { logDeveloperActivity } from "@/lib/admin/activity-log";

export const maxDuration = 120;

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

// ── Claude extraction from LinkedIn profile ──

async function extractFieldsFromLinkedIn(
  rawProfile: LinkedInRawProfile,
  existingName: string,
  existingEmail: string | null
): Promise<Record<string, unknown>> {
  // Build context from the raw LinkedIn profile
  const contextParts: string[] = [];
  contextParts.push(`Person: ${existingName}`);
  if (existingEmail) contextParts.push(`Email: ${existingEmail}`);

  if (rawProfile.full_name) contextParts.push(`LinkedIn Name: ${rawProfile.full_name}`);
  if (rawProfile.headline) contextParts.push(`Headline: ${rawProfile.headline}`);
  if (rawProfile.location) contextParts.push(`Location: ${rawProfile.location}`);

  if (rawProfile.about) {
    contextParts.push(`\nAbout section:\n${rawProfile.about}`);
  }

  if (rawProfile.experience.length > 0) {
    contextParts.push(`\nWork Experience:`);
    for (const exp of rawProfile.experience) {
      const parts = [exp.title, exp.company, exp.date_range, exp.location]
        .filter(Boolean)
        .join(" | ");
      contextParts.push(`  - ${parts}`);
      if (exp.description) {
        contextParts.push(`    ${exp.description}`);
      }
    }
  }

  if (rawProfile.education.length > 0) {
    contextParts.push(`\nEducation:`);
    for (const edu of rawProfile.education) {
      const parts = [edu.school, edu.degree, edu.field_of_study, edu.date_range]
        .filter(Boolean)
        .join(" | ");
      contextParts.push(`  - ${parts}`);
    }
  }

  if (rawProfile.skills.length > 0) {
    contextParts.push(`\nSkills: ${rawProfile.skills.join(", ")}`);
  }

  if (rawProfile.certifications.length > 0) {
    contextParts.push(`\nCertifications: ${rawProfile.certifications.join(", ")}`);
  }

  if (rawProfile.languages.length > 0) {
    contextParts.push(`\nLanguages spoken: ${rawProfile.languages.join(", ")}`);
  }

  const prompt = `Analyze this developer's LinkedIn profile data and return a JSON object with the following fields.
Use ONLY the data provided — do not make up information. If a field cannot be determined, use null.

${contextParts.join("\n")}

Return a JSON object with these exact fields:
{
  "seniority": one of "leadership", "senior", or "early_career" (leadership = VP/Director/CTO/Founder; senior = Senior/Staff/Lead/5+ years; early_career = Junior/Intern/<5 years),
  "role_type": comma-separated from: "full-stack", "frontend", "backend", "mobile", "devops", "data-engineer",
  "languages": comma-separated programming languages mentioned or implied by their work,
  "frameworks": comma-separated frameworks/libraries (React, Django, Express, Next.js, FastAPI, etc.),
  "databases": comma-separated database technologies if mentioned (PostgreSQL, MongoDB, Redis, etc.),
  "cloud_platforms": comma-separated cloud providers if mentioned (AWS, GCP, Azure, Vercel, etc.),
  "paid_tools": comma-separated paid dev tools if mentioned,
  "devops_tools": comma-separated DevOps tools if mentioned (Docker, Kubernetes, Terraform, etc.),
  "cicd_tools": comma-separated CI/CD tools if mentioned (GitHub Actions, Jenkins, etc.),
  "testing_frameworks": comma-separated testing tools if mentioned (Jest, Pytest, Cypress, etc.),
  "buying_influence": one of "decision_maker", "budget_holder", "team_influencer", or "individual_contributor",
  "industries": comma-separated industries they've worked in (SaaS, FinTech, Healthcare, etc.),
  "company_size": estimate current company size ("1-10", "11-50", "51-200", "201-1000", "1001-5000", "5000+"),
  "years_experience": estimated total years of professional software development (number as string),
  "city": city name or null,
  "state_region": full state/region name (e.g. "California" not "CA") or null,
  "country": full country name (e.g. "United States" not "US") or null,
  "job_title": their current job title,
  "company": their current company name,
  "open_source_activity": one of "none", "occasional", "regular", or "maintainer" based on any OSS mentions
}

Return ONLY the JSON object, no markdown fences or extra text.`;

  const response = await getAnthropic().messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const cleaned = text
    .replace(/```json?\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

// ── Map Claude output to DB fields (same logic as re-enrich buildDevFields) ──

function buildDevFields(
  data: Record<string, unknown>,
  existing: Record<string, unknown>,
  overwriteKeys: Set<string> = new Set()
): { fields: Record<string, unknown>; fieldsUpdated: string[] } {
  const VALID_SENIORITY = ["early_career", "senior", "leadership"] as const;
  const VALID_BUYING_INFLUENCE = [
    "individual_contributor", "team_influencer", "decision_maker", "budget_holder",
  ] as const;
  const VALID_COMPANY_SIZE = [
    "1-10", "11-50", "51-200", "201-1000", "1001-5000", "5000+",
  ] as const;
  const VALID_OSS_ACTIVITY = ["none", "occasional", "regular", "maintainer"] as const;

  const fields: Record<string, unknown> = {};
  const fieldsUpdated: string[] = [];

  const toArray = (csv: unknown) =>
    typeof csv === "string"
      ? csv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : undefined;

  // Only fill empty fields (unless key is in overwriteKeys)
  function setIfEmpty(
    dbKey: string,
    value: unknown,
    transform?: (v: unknown) => unknown
  ) {
    if (!overwriteKeys.has(dbKey)) {
      if (existing[dbKey] != null && existing[dbKey] !== "" && existing[dbKey] !== 0) {
        if (Array.isArray(existing[dbKey]) && (existing[dbKey] as unknown[]).length > 0) return;
        if (!Array.isArray(existing[dbKey])) return;
      }
    }
    if (value == null || value === "" || value === "null") return;
    const finalValue = transform ? transform(value) : value;
    if (finalValue == null) return;
    if (Array.isArray(finalValue) && finalValue.length === 0) return;
    fields[dbKey] = finalValue;
    fieldsUpdated.push(dbKey);
  }

  setIfEmpty("job_title", data.job_title);
  setIfEmpty("current_company", data.company);
  setIfEmpty("city", data.city);
  setIfEmpty("state_region", data.state_region);
  setIfEmpty("country", data.country);

  setIfEmpty("seniority", data.seniority, (v) => {
    const s = String(v).toLowerCase();
    const mapped = s === "mid" ? "senior" : s;
    return VALID_SENIORITY.includes(mapped as (typeof VALID_SENIORITY)[number]) ? mapped : null;
  });

  setIfEmpty("years_experience", data.years_experience, (v) => {
    const n = Number(v);
    return !isNaN(n) && n > 0 ? n : null;
  });

  setIfEmpty("buying_influence", data.buying_influence, (v) => {
    const bi = String(v).toLowerCase();
    return VALID_BUYING_INFLUENCE.includes(bi as (typeof VALID_BUYING_INFLUENCE)[number])
      ? bi
      : null;
  });

  setIfEmpty("company_size", data.company_size, (v) =>
    VALID_COMPANY_SIZE.includes(String(v) as (typeof VALID_COMPANY_SIZE)[number])
      ? String(v)
      : null
  );

  setIfEmpty("open_source_activity", data.open_source_activity, (v) => {
    const oss = String(v).toLowerCase();
    return VALID_OSS_ACTIVITY.includes(oss as (typeof VALID_OSS_ACTIVITY)[number])
      ? oss
      : null;
  });

  // Array fields
  setIfEmpty("role_types", data.role_type, toArray);
  setIfEmpty("languages", data.languages, toArray);
  setIfEmpty("frameworks", data.frameworks, toArray);
  setIfEmpty("databases", data.databases, toArray);
  setIfEmpty("cloud_platforms", data.cloud_platforms, toArray);
  setIfEmpty("devops_tools", data.devops_tools, toArray);
  setIfEmpty("cicd_tools", data.cicd_tools, toArray);
  setIfEmpty("testing_frameworks", data.testing_frameworks, toArray);
  setIfEmpty("paid_tools", data.paid_tools, toArray);
  setIfEmpty("industries", data.industries, toArray);

  return { fields, fieldsUpdated };
}

// ── Route handler ──

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { developerId } = (await request.json()) as { developerId: string };

  if (!developerId) {
    return NextResponse.json(
      { error: "developerId required" },
      { status: 400 }
    );
  }

  const serviceClient = createServiceClient();

  // Fetch developer record with all fields we might update
  const { data: dev, error: fetchError } = await serviceClient
    .from("developers")
    .select(
      "*, profiles!inner(full_name, email)"
    )
    .eq("id", developerId)
    .single();

  if (fetchError || !dev) {
    return NextResponse.json(
      { error: "Developer not found" },
      { status: 404 }
    );
  }

  const linkedinUrl = dev.linkedin_url as string | null;
  if (!linkedinUrl) {
    return NextResponse.json({
      status: "no_linkedin",
      fieldsUpdated: [],
    });
  }

  const profile = dev.profiles as unknown as {
    full_name: string;
    email: string;
  };

  // Step 1: Scrape LinkedIn via AgentQL
  let rawProfile: LinkedInRawProfile | null;
  try {
    rawProfile = await scrapeLinkedInProfile(linkedinUrl);
  } catch (err) {
    console.error(`[LinkedInEnrich] AgentQL error for ${developerId}:`, err);
    return NextResponse.json({
      status: "failed",
      error: err instanceof Error ? err.message : "AgentQL scrape failed",
      fieldsUpdated: [],
    });
  }

  if (!rawProfile) {
    return NextResponse.json({
      status: "failed",
      error: "No profile data returned from AgentQL",
      fieldsUpdated: [],
    });
  }

  // Step 2: Store raw profile in DB
  await serviceClient
    .from("developers")
    .update({ linkedin_raw_profile: rawProfile })
    .eq("id", developerId);

  // Step 3: Extract structured fields with Claude
  let claudeData: Record<string, unknown>;
  try {
    claudeData = await extractFieldsFromLinkedIn(
      rawProfile,
      profile.full_name,
      profile.email
    );
  } catch (err) {
    console.error(
      `[LinkedInEnrich] Claude extraction failed for ${developerId}:`,
      err
    );
    // Raw profile is saved — return partial success
    return NextResponse.json({
      status: "partial",
      fieldsUpdated: ["linkedin_raw_profile"],
      message: "Profile scraped but Claude extraction failed. Raw data saved.",
    });
  }

  // Check if developer has never logged in — if so, overwrite job title & company
  const overwriteKeys = new Set<string>();
  const profileId = dev.profile_id as string;
  if (profileId) {
    const { data: authData } = await serviceClient.auth.admin.getUserById(profileId);
    if (!authData?.user?.last_sign_in_at) {
      overwriteKeys.add("job_title");
      overwriteKeys.add("current_company");
    }
  }

  // Step 4: Map to DB fields, only filling empty ones (except overwriteKeys)
  const { fields, fieldsUpdated } = buildDevFields(claudeData, dev, overwriteKeys);

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({
      status: "partial",
      fieldsUpdated: ["linkedin_raw_profile"],
      message: "Profile scraped but no empty fields to fill",
    });
  }

  fields.last_enriched_at = new Date().toISOString();

  const { error: updateError } = await serviceClient
    .from("developers")
    .update(fields)
    .eq("id", developerId);

  if (updateError) {
    console.error(
      `[LinkedInEnrich] Update failed for ${developerId}:`,
      updateError.message
    );
    return NextResponse.json({
      status: "failed",
      error: updateError.message,
      fieldsUpdated: ["linkedin_raw_profile"],
    });
  }

  console.log(
    `[LinkedInEnrich] Enriched ${profile.full_name}: ${fieldsUpdated.join(", ")}`
  );

  logDeveloperActivity(serviceClient, developerId, user.id, "enriched", {
    fields_updated: [...fieldsUpdated, "linkedin_raw_profile"],
    source: "linkedin_agentql",
  });

  return NextResponse.json({
    status: "enriched",
    fieldsUpdated: [...fieldsUpdated, "linkedin_raw_profile"],
  });
}
