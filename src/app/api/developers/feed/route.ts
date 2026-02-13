import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatEnumLabel, countryOptions } from "@/lib/admin/filter-options";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

const LOWERCASE_WORDS = new Set(["of", "and", "the", "in", "for", "on", "at", "to", "a", "an"]);

function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word, i) =>
      i > 0 && LOWERCASE_WORDS.has(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function parseArray(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

const FEED_SIZE = 24;

// Fictional sample profiles mixed into the feed to make the network feel full.
// Remove once the developer pool is large enough on its own.
const sampleDevelopers: AnonymizedDeveloper[] = [
  { jobTitle: "Senior Backend Engineer", seniority: "Senior", experience: "8 yrs", roleTypes: ["Backend"], languages: ["Go", "Python"], frameworks: ["Gin", "FastAPI"], buyingInfluence: "Team Lead", paidTools: ["Datadog", "GitHub Copilot"], country: "United States" },
  { jobTitle: "Full Stack Developer", seniority: "Early Career", experience: "3 yrs", roleTypes: ["Full Stack"], languages: ["TypeScript", "Python"], frameworks: ["Next.js", "Django"], buyingInfluence: "Individual Contributor", paidTools: ["Vercel", "Linear"], country: "Canada" },
  { jobTitle: "Staff Platform Engineer", seniority: "Leadership", experience: "12 yrs", roleTypes: ["DevOps", "Backend"], languages: ["Go", "Rust"], frameworks: ["Kubernetes"], buyingInfluence: "Final Decision Maker", paidTools: ["AWS", "Terraform Cloud", "PagerDuty"], country: "Germany" },
  { jobTitle: "Frontend Engineer", seniority: "Senior", experience: "6 yrs", roleTypes: ["Frontend"], languages: ["TypeScript", "JavaScript"], frameworks: ["React", "Tailwind CSS"], buyingInfluence: "Individual Contributor", paidTools: ["Figma", "Storybook"], country: "United Kingdom" },
  { jobTitle: "Mobile Developer", seniority: "Senior", experience: "7 yrs", roleTypes: ["Mobile"], languages: ["Swift", "Kotlin"], frameworks: ["SwiftUI", "Jetpack Compose"], buyingInfluence: "Team Lead", paidTools: ["Firebase", "RevenueCat"], country: "Australia" },
  { jobTitle: "Data Engineer", seniority: "Senior", experience: "6 yrs", roleTypes: ["Backend", "Data"], languages: ["Python", "SQL"], frameworks: ["Apache Spark", "dbt"], buyingInfluence: "Recommender", paidTools: ["Snowflake", "Databricks"], country: "Netherlands" },
  { jobTitle: "DevOps Engineer", seniority: "Early Career", experience: "2 yrs", roleTypes: ["DevOps"], languages: ["Python", "Bash"], frameworks: ["Terraform", "Ansible"], buyingInfluence: "Recommender", paidTools: ["AWS", "CircleCI", "Datadog"], country: "Brazil" },
  { jobTitle: "Principal Software Architect", seniority: "Leadership", experience: "15 yrs", roleTypes: ["Backend", "Full Stack"], languages: ["Java", "Kotlin", "TypeScript"], frameworks: ["Spring Boot", "React"], buyingInfluence: "Final Decision Maker", paidTools: ["IntelliJ IDEA", "Jira", "Confluence"], country: "United States" },
  { jobTitle: "Machine Learning Engineer", seniority: "Senior", experience: "6 yrs", roleTypes: ["Backend", "Data"], languages: ["Python", "C++"], frameworks: ["PyTorch", "FastAPI"], buyingInfluence: "Recommender", paidTools: ["Weights & Biases", "AWS SageMaker"], country: "India" },
  { jobTitle: "iOS Developer", seniority: "Early Career", experience: "2 yrs", roleTypes: ["Mobile"], languages: ["Swift", "Objective-C"], frameworks: ["SwiftUI", "Combine"], buyingInfluence: "Individual Contributor", paidTools: ["Xcode Cloud", "Firebase"], country: "France" },
  { jobTitle: "Site Reliability Engineer", seniority: "Leadership", experience: "9 yrs", roleTypes: ["DevOps", "Backend"], languages: ["Go", "Python", "Bash"], frameworks: ["Kubernetes", "Prometheus"], buyingInfluence: "Team Lead", paidTools: ["PagerDuty", "Grafana Cloud", "AWS"], country: "Japan" },
  { jobTitle: "Full Stack Developer", seniority: "Early Career", experience: "2 yrs", roleTypes: ["Full Stack"], languages: ["JavaScript", "TypeScript"], frameworks: ["Next.js", "Express"], buyingInfluence: "Individual Contributor", paidTools: ["Vercel", "GitHub Copilot"], country: "Nigeria" },
];

interface AnonymizedDeveloper {
  jobTitle: string | null;
  roleTypes: string[];
  seniority: string | null;
  experience: string;
  languages: string[];
  frameworks: string[];
  buyingInfluence: string | null;
  paidTools: string[];
  country: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const roleTypes = parseArray(searchParams.get("role_types"));
  const seniority = parseArray(searchParams.get("seniority"));
  const languages = parseArray(searchParams.get("languages"));
  const frameworks = parseArray(searchParams.get("frameworks"));
  const countries = parseArray(searchParams.get("country"));
  const databases = parseArray(searchParams.get("databases"));
  const cloudPlatforms = parseArray(searchParams.get("cloud_platforms"));
  const devopsTools = parseArray(searchParams.get("devops_tools"));
  const cicdTools = parseArray(searchParams.get("cicd_tools"));
  const testingFrameworks = parseArray(searchParams.get("testing_frameworks"));
  const apiExperience = parseArray(searchParams.get("api_experience"));
  const operatingSystems = parseArray(searchParams.get("operating_systems"));
  const industries = parseArray(searchParams.get("industries"));
  const companySize = parseArray(searchParams.get("company_size"));
  const buyingInfluence = parseArray(searchParams.get("buying_influence"));
  const paidTools = parseArray(searchParams.get("paid_tools"));
  const ossActivity = parseArray(searchParams.get("open_source_activity"));

  const supabase = createServiceClient();

  const sort = searchParams.get("sort") ?? "completeness";

  // Only select safe, non-identifying columns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("developers")
    .select("job_title, seniority, role_types, languages, frameworks, years_experience, country, buying_influence, paid_tools, profile_complete");

  // Array overlap filters
  if (roleTypes.length) query = query.overlaps("role_types", roleTypes);
  if (languages.length) query = query.overlaps("languages", languages);
  if (frameworks.length) query = query.overlaps("frameworks", frameworks);
  if (databases.length) query = query.overlaps("databases", databases);
  if (cloudPlatforms.length) query = query.overlaps("cloud_platforms", cloudPlatforms);
  if (devopsTools.length) query = query.overlaps("devops_tools", devopsTools);
  if (cicdTools.length) query = query.overlaps("cicd_tools", cicdTools);
  if (testingFrameworks.length) query = query.overlaps("testing_frameworks", testingFrameworks);
  if (apiExperience.length) query = query.overlaps("api_experience", apiExperience);
  if (operatingSystems.length) query = query.overlaps("operating_systems", operatingSystems);
  if (industries.length) query = query.overlaps("industries", industries);
  if (paidTools.length) query = query.overlaps("paid_tools", paidTools);

  // Enum in filters
  if (seniority.length) query = query.in("seniority", seniority);
  if (countries.length) query = query.in("country", countries);
  if (companySize.length) query = query.in("company_size", companySize);
  if (buyingInfluence.length) query = query.in("buying_influence", buyingInfluence);
  if (ossActivity.length) query = query.in("open_source_activity", ossActivity);

  // Sort: default to most complete profiles first
  if (sort === "experience") {
    query = query.order("years_experience", { ascending: false, nullsFirst: false });
  } else {
    // "completeness" — complete profiles first, then by experience
    query = query
      .order("profile_complete", { ascending: false, nullsFirst: false })
      .order("years_experience", { ascending: false, nullsFirst: false });
  }

  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;

  // Fetch a page of results
  query = query.range(offset, offset + FEED_SIZE - 1);

  const { data, error } = await query;

  if (error) {
    console.error("Developer feed query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // Anonymize: return formatted field values, no PII
  const developers: AnonymizedDeveloper[] = (data ?? []).map(
    (dev: Record<string, unknown>) => {
      const devSeniority = (dev.seniority as string) ?? null;
      const years = dev.years_experience as number | null;

      // Only show country if it matches a known country name (privacy: strip city/state)
      const rawCountry = (dev.country as string) ?? null;
      const safeCountry =
        rawCountry && countryOptions.includes(rawCountry) ? rawCountry : null;

      const devBuyingInfluence = (dev.buying_influence as string) ?? null;

      return {
        jobTitle: dev.job_title ? toTitleCase(dev.job_title as string) : null,
        roleTypes: ((dev.role_types as string[]) ?? []).map(formatEnumLabel),
        seniority: devSeniority ? formatEnumLabel(devSeniority) : null,
        experience: years ? `${years} yrs` : "—",
        languages: ((dev.languages as string[]) ?? []).map(formatEnumLabel),
        frameworks: ((dev.frameworks as string[]) ?? []).map(formatEnumLabel),
        buyingInfluence: devBuyingInfluence ? formatEnumLabel(devBuyingInfluence) : null,
        paidTools: ((dev.paid_tools as string[]) ?? []).map(formatEnumLabel),
        country: safeCountry,
      };
    }
  );

  // Filter sample profiles to match active filters, then interleave with real data
  const activeFilters = {
    role_types: roleTypes, seniority, languages, frameworks, country: countries,
    buying_influence: buyingInfluence, paid_tools: paidTools,
  };
  const hasActiveFilters = Object.values(activeFilters).some((arr) => arr.length > 0) ||
    [databases, cloudPlatforms, devopsTools, cicdTools, testingFrameworks,
     apiExperience, operatingSystems, industries, companySize, ossActivity]
    .some((arr) => arr.length > 0);

  // Only include sample devs that match the current filters
  const filteredSamples = sampleDevelopers.filter((s) => {
    if (roleTypes.length && !roleTypes.some((r) => s.roleTypes.includes(r))) return false;
    if (seniority.length && (!s.seniority || !seniority.some((v) => formatEnumLabel(v) === s.seniority))) return false;
    if (languages.length && !languages.some((l) => s.languages.includes(formatEnumLabel(l)))) return false;
    if (frameworks.length && !frameworks.some((f) => s.frameworks.includes(formatEnumLabel(f)))) return false;
    if (countries.length && (!s.country || !countries.includes(s.country))) return false;
    if (buyingInfluence.length && (!s.buyingInfluence || !buyingInfluence.some((b) => formatEnumLabel(b) === s.buyingInfluence))) return false;
    if (paidTools.length && !paidTools.some((t) => s.paidTools.includes(formatEnumLabel(t)))) return false;
    // Filters that sample data doesn't have (databases, cloud, etc.) — exclude samples if those are active
    if (databases.length || cloudPlatforms.length || devopsTools.length || cicdTools.length ||
        testingFrameworks.length || apiExperience.length || operatingSystems.length ||
        industries.length || companySize.length || ossActivity.length) return false;
    return true;
  });

  const realCount = developers.length;
  const feed: AnonymizedDeveloper[] = [];
  let realIdx = 0;
  let sampleIdx = 0;

  // Alternate: 2 real, 1 sample — so it always feels mixed
  while (feed.length < FEED_SIZE) {
    if (realIdx < realCount) {
      feed.push(developers[realIdx++]);
      if (realIdx < realCount && feed.length < FEED_SIZE) {
        feed.push(developers[realIdx++]);
      }
    }
    if (sampleIdx < filteredSamples.length && feed.length < FEED_SIZE) {
      feed.push(filteredSamples[sampleIdx++]);
    }
    // Stop if we've exhausted both sources
    if (realIdx >= realCount && sampleIdx >= filteredSamples.length) break;
  }

  // There's more to load if the DB returned a full page (meaning more real devs exist)
  const hasMore = realCount === FEED_SIZE;

  return NextResponse.json(
    { developers: feed, hasMore },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
