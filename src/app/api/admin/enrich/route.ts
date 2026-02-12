import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  enrichContact,
  type EnrichmentInput,
  type EnrichmentResult,
} from "@/lib/enrichment";

export const maxDuration = 60; // Allow up to 60s for batch enrichment

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

  // Build enrichment fields
  const VALID_SENIORITY = ["early_career", "senior", "leadership"] as const;
  const devFields: Record<string, unknown> = {
    imported: true,
    import_source: "folk",
  };

  if (contact.jobTitle) devFields.job_title = contact.jobTitle;
  if (contact.company) devFields.current_company = contact.company;
  if (contact.linkedinUrl) devFields.linkedin_url = contact.linkedinUrl;
  if (result.data.country) devFields.country = result.data.country;
  if (result.data.stateRegion) devFields.state_region = result.data.stateRegion;
  if (result.data.city) devFields.city = result.data.city;
  if (result.data.seniority) {
    // Validate against DB enum — "mid" maps to "senior"
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
  if (result.data.languages)
    devFields.languages = result.data.languages
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
  if (result.data.roleType)
    devFields.role_types = result.data.roleType
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

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
