import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { reEnrichDeveloper, type EnrichmentData } from "@/lib/enrichment";
import { logDeveloperActivity } from "@/lib/admin/activity-log";
import { updateFolkPerson, type FolkSyncData } from "@/lib/folk";

export const maxDuration = 60;

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

/** Map EnrichmentData to developer DB columns with enum validation */
function buildDevFields(data: EnrichmentData): Record<string, unknown> {
  const VALID_SENIORITY = ["early_career", "senior", "leadership"] as const;
  const VALID_BUYING_INFLUENCE = ["individual_contributor", "team_influencer", "decision_maker", "budget_holder"] as const;
  const VALID_COMPANY_SIZE = ["1-10", "11-50", "51-200", "201-1000", "1001-5000", "5000+"] as const;
  const VALID_OSS_ACTIVITY = ["none", "occasional", "regular", "maintainer"] as const;

  const fields: Record<string, unknown> = {};

  if (data.jobTitle) fields.job_title = data.jobTitle;
  if (data.company) fields.current_company = data.company;
  if (data.country) fields.country = data.country;
  if (data.stateRegion) fields.state_region = data.stateRegion;
  if (data.city) fields.city = data.city;

  if (data.githubUsername) {
    fields.github_url = `https://github.com/${data.githubUsername}`;
  }
  if (data.githubBlog) fields.website_url = data.githubBlog;
  if (data.twitterUsername) {
    fields.twitter_url = `https://x.com/${data.twitterUsername}`;
  }
  if (data.linkedinUrl) fields.linkedin_url = data.linkedinUrl;
  if (data.openSourceActivity) {
    if (VALID_OSS_ACTIVITY.includes(data.openSourceActivity as (typeof VALID_OSS_ACTIVITY)[number])) {
      fields.open_source_activity = data.openSourceActivity;
    }
  }

  if (data.seniority) {
    const s = data.seniority.toLowerCase();
    const mapped = s === "mid" ? "senior" : s;
    if (VALID_SENIORITY.includes(mapped as (typeof VALID_SENIORITY)[number])) {
      fields.seniority = mapped;
    }
  }
  if (data.yearsExperience) {
    const yoe = Number(data.yearsExperience);
    if (!isNaN(yoe)) fields.years_experience = yoe;
  }
  if (data.buyingInfluence) {
    const bi = data.buyingInfluence.toLowerCase();
    if (VALID_BUYING_INFLUENCE.includes(bi as (typeof VALID_BUYING_INFLUENCE)[number])) {
      fields.buying_influence = bi;
    }
  }
  if (data.companySize) {
    if (VALID_COMPANY_SIZE.includes(data.companySize as (typeof VALID_COMPANY_SIZE)[number])) {
      fields.company_size = data.companySize;
    }
  }

  const toArray = (csv: string | null) =>
    csv ? csv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : undefined;

  if (data.languages) fields.languages = toArray(data.languages);
  if (data.roleType) fields.role_types = toArray(data.roleType);
  if (data.frameworks) fields.frameworks = toArray(data.frameworks);
  if (data.databases) fields.databases = toArray(data.databases);
  if (data.cloudPlatforms) fields.cloud_platforms = toArray(data.cloudPlatforms);
  if (data.paidTools) fields.paid_tools = toArray(data.paidTools);
  if (data.devopsTools) fields.devops_tools = toArray(data.devopsTools);
  if (data.cicdTools) fields.cicd_tools = toArray(data.cicdTools);
  if (data.testingFrameworks) fields.testing_frameworks = toArray(data.testingFrameworks);
  if (data.industries) fields.industries = toArray(data.industries);

  return fields;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { developerIds } = (await request.json()) as { developerIds: string[] };

  if (!developerIds?.length) {
    return NextResponse.json({ error: "developerIds required" }, { status: 400 });
  }
  if (developerIds.length > 10) {
    return NextResponse.json({ error: "Maximum 10 per batch" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Look up developer + profile data
  const { data: developers, error: fetchError } = await serviceClient
    .from("developers")
    .select("id, job_title, current_company, linkedin_url, github_url, folk_person_id, folk_group_id, profiles!inner(full_name, email)")
    .in("id", developerIds);

  if (fetchError || !developers) {
    return NextResponse.json({ error: "Failed to fetch developers" }, { status: 500 });
  }

  const results = [];
  for (const dev of developers) {
    const profile = dev.profiles as unknown as { full_name: string; email: string };

    const result = await reEnrichDeveloper({
      name: profile.full_name,
      email: profile.email,
      linkedinUrl: dev.linkedin_url,
      jobTitle: dev.job_title,
      company: dev.current_company,
      githubUrl: dev.github_url,
    });

    if (result.status !== "failed" && result.data) {
      const fields = buildDevFields(result.data);
      fields.last_enriched_at = new Date().toISOString();
      const { error: updateError } = await serviceClient
        .from("developers")
        .update(fields)
        .eq("id", dev.id);

      if (updateError) {
        console.error(`Re-enrich update failed for ${profile.full_name}:`, updateError.message);
        results.push({ id: dev.id, name: profile.full_name, status: "failed" as const, error: updateError.message });
      } else {
        console.log(`Re-enriched ${profile.full_name}: ${Object.keys(fields).length} fields updated`);
        logDeveloperActivity(serviceClient, dev.id, user!.id, "enriched", {
          fields_updated: Object.keys(fields),
          source: "github_claude",
        });

        // Sync back to Folk if we have Folk IDs
        if (dev.folk_person_id && dev.folk_group_id) {
          const syncData: FolkSyncData = {
            githubUrl: result.data.githubUsername ? `https://github.com/${result.data.githubUsername}` : null,
            twitterUrl: result.data.twitterUsername ? `https://x.com/${result.data.twitterUsername}` : null,
            websiteUrl: result.data.githubBlog ?? null,
            seniority: result.data.seniority ?? null,
            languages: result.data.languages ?? null,
            roleType: result.data.roleType ?? null,
            yearsExperience: result.data.yearsExperience ? Number(result.data.yearsExperience) : null,
            location: result.data.location ?? null,
            frameworks: result.data.frameworks ?? null,
            databases: result.data.databases ?? null,
            industries: result.data.industries ?? null,
          };
          const folkResult = await updateFolkPerson(dev.folk_person_id, dev.folk_group_id, syncData);
          if (!folkResult.ok) {
            console.warn(`Folk sync-back failed for ${profile.full_name}: ${folkResult.error}`);
          }
        }

        results.push({ id: dev.id, name: profile.full_name, status: result.status, data: result.data });
      }
    } else {
      results.push({ id: dev.id, name: profile.full_name, status: result.status, error: result.error });
    }
  }

  return NextResponse.json({ results });
}
