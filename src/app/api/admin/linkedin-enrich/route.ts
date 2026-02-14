import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { queryLinkedInProfile } from "@/lib/agentql";
import { logDeveloperActivity } from "@/lib/admin/activity-log";

export const maxDuration = 60;

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

// ── Skills taxonomy for mapping LinkedIn skills → DB columns ──

const LANGUAGES = new Set([
  "javascript", "typescript", "python", "java", "c#", "c++", "c", "go",
  "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "perl",
  "elixir", "clojure", "haskell", "lua", "dart", "objective-c", "shell",
  "bash", "powershell", "sql", "html", "css", "solidity",
]);

const FRAMEWORKS = new Set([
  "react", "react.js", "reactjs", "next.js", "nextjs", "angular", "vue",
  "vue.js", "vuejs", "svelte", "express", "express.js", "django", "flask",
  "fastapi", "spring", "spring boot", "rails", "ruby on rails", "laravel",
  ".net", "asp.net", "node.js", "nodejs", "deno", "remix", "gatsby",
  "nuxt", "nuxt.js", "ember", "backbone", "tailwind", "tailwindcss",
  "bootstrap", "jquery", "graphql",
]);

const CLOUD_PLATFORMS = new Set([
  "aws", "amazon web services", "azure", "microsoft azure", "gcp",
  "google cloud", "google cloud platform", "vercel", "heroku",
  "digitalocean", "cloudflare", "netlify", "firebase",
]);

const DATABASES = new Set([
  "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
  "dynamodb", "sqlite", "oracle", "sql server", "cassandra", "neo4j",
  "supabase", "firebase", "cockroachdb", "mariadb",
]);

function classifySkills(skills: string[]): {
  languages: string[];
  frameworks: string[];
  cloudPlatforms: string[];
  databases: string[];
} {
  const languages: string[] = [];
  const frameworks: string[] = [];
  const cloudPlatforms: string[] = [];
  const databases: string[] = [];

  for (const skill of skills) {
    const lower = skill.toLowerCase().trim();
    if (LANGUAGES.has(lower)) languages.push(lower);
    else if (FRAMEWORKS.has(lower)) frameworks.push(lower);
    else if (CLOUD_PLATFORMS.has(lower)) cloudPlatforms.push(lower);
    else if (DATABASES.has(lower)) databases.push(lower);
  }

  return { languages, frameworks, cloudPlatforms, databases };
}

// ── Location parsing ──

function parseLocation(location: string): {
  city: string | null;
  stateRegion: string | null;
  country: string | null;
} {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return { city: parts[0], stateRegion: parts[1], country: parts[2] };
  }
  if (parts.length === 2) {
    return { city: parts[0], stateRegion: null, country: parts[1] };
  }
  if (parts.length === 1) {
    return { city: null, stateRegion: null, country: parts[0] };
  }
  return { city: null, stateRegion: null, country: null };
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
    return NextResponse.json({ error: "developerId required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Fetch developer record
  const { data: dev, error: fetchError } = await serviceClient
    .from("developers")
    .select(
      "id, linkedin_url, job_title, current_company, city, state_region, country, years_experience, languages, frameworks, cloud_platforms, databases, profiles!inner(full_name, email)"
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

  // Query LinkedIn via AgentQL
  let profileData;
  try {
    profileData = await queryLinkedInProfile(linkedinUrl);
  } catch (err) {
    console.error(`[LinkedInEnrich] AgentQL error for ${developerId}:`, err);
    return NextResponse.json({
      status: "failed",
      error: err instanceof Error ? err.message : "AgentQL query failed",
      fieldsUpdated: [],
    });
  }

  if (!profileData) {
    return NextResponse.json({
      status: "failed",
      error: "No profile data returned from AgentQL",
      fieldsUpdated: [],
    });
  }

  // Build update fields — only fill empty fields
  const fields: Record<string, unknown> = {};
  const fieldsUpdated: string[] = [];

  // Job title: prefer jobTitle, fall back to headline
  if (!dev.job_title && (profileData.jobTitle || profileData.headline)) {
    fields.job_title = profileData.jobTitle || profileData.headline;
    fieldsUpdated.push("job_title");
  }

  if (!dev.current_company && profileData.company) {
    fields.current_company = profileData.company;
    fieldsUpdated.push("current_company");
  }

  // Location
  if (profileData.location && (!dev.city || !dev.country)) {
    const loc = parseLocation(profileData.location);
    if (!dev.city && loc.city) {
      fields.city = loc.city;
      fieldsUpdated.push("city");
    }
    if (!dev.state_region && loc.stateRegion) {
      fields.state_region = loc.stateRegion;
      fieldsUpdated.push("state_region");
    }
    if (!dev.country && loc.country) {
      fields.country = loc.country;
      fieldsUpdated.push("country");
    }
  }

  // Years of experience
  if (!dev.years_experience && profileData.experienceYears) {
    fields.years_experience = profileData.experienceYears;
    fieldsUpdated.push("years_experience");
  }

  // Skills → languages, frameworks, cloud_platforms, databases
  if (profileData.skills.length > 0) {
    const classified = classifySkills(profileData.skills);

    const existingLangs = (dev.languages as string[] | null) ?? [];
    if (existingLangs.length === 0 && classified.languages.length > 0) {
      fields.languages = classified.languages;
      fieldsUpdated.push("languages");
    }

    const existingFrameworks = (dev.frameworks as string[] | null) ?? [];
    if (existingFrameworks.length === 0 && classified.frameworks.length > 0) {
      fields.frameworks = classified.frameworks;
      fieldsUpdated.push("frameworks");
    }

    const existingCloud = (dev.cloud_platforms as string[] | null) ?? [];
    if (existingCloud.length === 0 && classified.cloudPlatforms.length > 0) {
      fields.cloud_platforms = classified.cloudPlatforms;
      fieldsUpdated.push("cloud_platforms");
    }

    const existingDb = (dev.databases as string[] | null) ?? [];
    if (existingDb.length === 0 && classified.databases.length > 0) {
      fields.databases = classified.databases;
      fieldsUpdated.push("databases");
    }
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({
      status: "partial",
      fieldsUpdated: [],
      message: "No empty fields to fill",
    });
  }

  // Always update last_enriched_at
  fields.last_enriched_at = new Date().toISOString();

  const { error: updateError } = await serviceClient
    .from("developers")
    .update(fields)
    .eq("id", developerId);

  if (updateError) {
    console.error(`[LinkedInEnrich] Update failed for ${developerId}:`, updateError.message);
    return NextResponse.json({
      status: "failed",
      error: updateError.message,
      fieldsUpdated: [],
    });
  }

  const profile = dev.profiles as unknown as { full_name: string };
  console.log(
    `[LinkedInEnrich] Enriched ${profile.full_name}: ${fieldsUpdated.join(", ")}`
  );

  logDeveloperActivity(serviceClient, developerId, user.id, "enriched", {
    fields_updated: fieldsUpdated,
    source: "linkedin_agentql",
  });

  return NextResponse.json({
    status: "enriched",
    fieldsUpdated,
  });
}
