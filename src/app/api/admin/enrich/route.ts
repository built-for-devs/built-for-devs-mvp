import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  enrichContact,
  type EnrichmentInput,
  type EnrichmentResult,
} from "@/lib/enrichment";

export const maxDuration = 60; // GitHub API + Claude: ~5-10s per contact

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

/**
 * After enrichment succeeds, create or update the developer in BFD.
 * - New email → create auth user + update developer record
 * - Existing email → update developer record with fresh enrichment data
 */
async function syncToBfd(
  contact: EnrichmentInput,
  result: EnrichmentResult
) {
  if (!result.data) {
    console.log(`BFD sync skipped for ${contact.name}: no enrichment data`);
    return;
  }
  if (!contact.email) {
    console.log(`BFD sync skipped for ${contact.name}: no email address`);
    return;
  }

  const supabase = createServiceClient();

  // Check if developer already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", contact.email)
    .maybeSingle();

  let profileId: string;
  let isNew = false;

  if (existing) {
    profileId = existing.id;
  } else {
    // Create new auth user
    const name = contact.name || contact.email;
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: contact.email,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: "developer",
        },
      });

    if (authError || !authUser.user) {
      console.error(`BFD sync failed for ${contact.email}:`, authError?.message);
      return;
    }
    profileId = authUser.user.id;
    isNew = true;
  }

  // Build enrichment fields — validate enums to prevent Postgres rejecting the entire update
  const VALID_SENIORITY = ["early_career", "senior", "leadership"] as const;
  const VALID_BUYING_INFLUENCE = ["individual_contributor", "team_influencer", "decision_maker", "budget_holder"] as const;
  const VALID_COMPANY_SIZE = ["1-10", "11-50", "51-200", "201-1000", "1001-5000", "5000+"] as const;
  const VALID_OSS_ACTIVITY = ["none", "occasional", "regular", "maintainer"] as const;

  const devFields: Record<string, unknown> = {
    imported: true,
    import_source: "folk",
    last_enriched_at: new Date().toISOString(),
  };

  devFields.job_title = result.data.jobTitle || contact.jobTitle || null;
  devFields.current_company = result.data.company || contact.company || null;
  if (contact.linkedinUrl) devFields.linkedin_url = contact.linkedinUrl;
  else if (result.data.linkedinUrl) devFields.linkedin_url = result.data.linkedinUrl;
  if (result.data.country) devFields.country = result.data.country;
  if (result.data.stateRegion) devFields.state_region = result.data.stateRegion;
  if (result.data.city) devFields.city = result.data.city;

  // GitHub-direct fields
  if (result.data.githubUsername) {
    devFields.github_url = `https://github.com/${result.data.githubUsername}`;
  }
  if (result.data.githubBlog) devFields.website_url = result.data.githubBlog;
  if (result.data.twitterUsername) {
    devFields.twitter_url = `https://x.com/${result.data.twitterUsername}`;
  }
  if (result.data.openSourceActivity) {
    if (VALID_OSS_ACTIVITY.includes(result.data.openSourceActivity as (typeof VALID_OSS_ACTIVITY)[number])) {
      devFields.open_source_activity = result.data.openSourceActivity;
    }
  }

  if (result.data.seniority) {
    const s = result.data.seniority.toLowerCase();
    const mapped = s === "mid" ? "senior" : s;
    if (VALID_SENIORITY.includes(mapped as (typeof VALID_SENIORITY)[number])) {
      devFields.seniority = mapped;
    }
  }
  if (result.data.yearsExperience) {
    const yoe = Number(result.data.yearsExperience);
    if (!isNaN(yoe)) devFields.years_experience = yoe;
  }
  if (result.data.buyingInfluence) {
    const bi = result.data.buyingInfluence.toLowerCase();
    if (VALID_BUYING_INFLUENCE.includes(bi as (typeof VALID_BUYING_INFLUENCE)[number])) {
      devFields.buying_influence = bi;
    }
  }
  if (result.data.companySize) {
    if (VALID_COMPANY_SIZE.includes(result.data.companySize as (typeof VALID_COMPANY_SIZE)[number])) {
      devFields.company_size = result.data.companySize;
    }
  }

  const toArray = (csv: string | null) =>
    csv ? csv.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

  if (result.data.languages) devFields.languages = toArray(result.data.languages);
  if (result.data.roleType) devFields.role_types = toArray(result.data.roleType);
  if (result.data.frameworks) devFields.frameworks = toArray(result.data.frameworks);
  if (result.data.databases) devFields.databases = toArray(result.data.databases);
  if (result.data.cloudPlatforms) devFields.cloud_platforms = toArray(result.data.cloudPlatforms);
  if (result.data.paidTools) devFields.paid_tools = toArray(result.data.paidTools);
  if (result.data.devopsTools) devFields.devops_tools = toArray(result.data.devopsTools);
  if (result.data.cicdTools) devFields.cicd_tools = toArray(result.data.cicdTools);
  if (result.data.testingFrameworks) devFields.testing_frameworks = toArray(result.data.testingFrameworks);
  if (result.data.industries) devFields.industries = toArray(result.data.industries);

  // Wait for the handle_new_user trigger to create the developer record.
  // For new users, retry a few times since the trigger runs asynchronously.
  let devRecord: { id: string } | null = null;
  const maxRetries = isNew ? 5 : 1;
  for (let i = 0; i < maxRetries; i++) {
    const { data } = await supabase
      .from("developers")
      .select("id")
      .eq("profile_id", profileId)
      .single();
    if (data) {
      devRecord = data;
      break;
    }
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (devRecord) {
    const { error } = await supabase
      .from("developers")
      .update(devFields)
      .eq("id", devRecord.id);
    if (error) {
      console.error(`BFD developer update failed for ${contact.email}:`, error.message);
    } else {
      console.log(`BFD sync OK for ${contact.email} (${isNew ? "created" : "updated"})`);
    }
  } else {
    console.error(`BFD sync: no developer record found for ${contact.email} (profile_id: ${profileId})`);
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { contacts, groupId } = body as {
    contacts: EnrichmentInput[];
    groupId: string;
  };

  if (!contacts?.length || !groupId) {
    return NextResponse.json(
      { error: "contacts and groupId are required" },
      { status: 400 }
    );
  }

  if (contacts.length > 10) {
    return NextResponse.json(
      { error: "Maximum 10 contacts per batch" },
      { status: 400 }
    );
  }

  // Process contacts sequentially to avoid rate limits
  const results = [];
  for (const contact of contacts) {
    const result = await enrichContact(contact, groupId);
    results.push(result);

    // Sync successful enrichments to BFD
    if (result.status !== "failed") {
      try {
        await syncToBfd(contact, result);
      } catch (err) {
        console.error(`BFD sync error for ${contact.name}:`, err);
      }
    }
  }

  const enriched = results.filter((r) => r.status === "enriched").length;
  const partial = results.filter((r) => r.status === "partial").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({ results, enriched, partial, failed });
}
