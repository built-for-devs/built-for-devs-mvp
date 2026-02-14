import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  roleTypeOptions,
  seniorityOptions,
  languageOptions,
  frameworkOptions,
  countryOptions,
  databaseOptions,
  cloudPlatformOptions,
  devopsToolOptions,
  cicdToolOptions,
  testingFrameworkOptions,
  apiExperienceOptions,
  operatingSystemOptions,
  industryOptions,
  companySizeOptions,
  buyingInfluenceOptions,
  paidToolOptions,
  ossActivityOptions,
} from "@/lib/admin/filter-options";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

// Static base options per column (the predefined lists)
const baseOptions: Record<string, readonly string[]> = {
  role_types: roleTypeOptions,
  seniority: seniorityOptions,
  languages: languageOptions,
  frameworks: frameworkOptions,
  databases: databaseOptions,
  cloud_platforms: cloudPlatformOptions,
  devops_tools: devopsToolOptions,
  cicd_tools: cicdToolOptions,
  testing_frameworks: testingFrameworkOptions,
  api_experience: apiExperienceOptions,
  operating_systems: operatingSystemOptions,
  industries: industryOptions,
  company_size: companySizeOptions,
  buying_influence: buyingInfluenceOptions,
  paid_tools: paidToolOptions,
  open_source_activity: ossActivityOptions,
  country: countryOptions,
};

// Array columns we collect distinct values from
const arrayColumns = [
  "role_types",
  "languages",
  "frameworks",
  "databases",
  "cloud_platforms",
  "devops_tools",
  "cicd_tools",
  "testing_frameworks",
  "api_experience",
  "operating_systems",
  "industries",
  "paid_tools",
] as const;

// Scalar columns we collect distinct values from
const scalarColumns = [
  "seniority",
  "country",
  "company_size",
  "buying_influence",
  "open_source_activity",
] as const;

export async function GET() {
  const supabase = createServiceClient();

  // Fetch all developers' filterable columns (safe — no PII)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("developers")
    .select([...arrayColumns, ...scalarColumns].join(", "))
    .limit(1000);

  if (error) {
    console.error("Developer feed options error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const rows = (data ?? []) as Record<string, unknown>[];

  const options: Record<string, string[]> = {};

  // Merge static base options + any custom values from the database.
  // Normalize to lowercase to avoid case-sensitive duplicates (e.g. "laravel" vs "Laravel").
  // Display formatting is handled by formatEnumLabel on the client.
  for (const col of arrayColumns) {
    const valueSet = new Set<string>(baseOptions[col] ?? []);
    for (const row of rows) {
      const arr = row[col] as string[] | null;
      if (arr) arr.forEach((v) => valueSet.add(v.toLowerCase()));
    }
    options[col] = Array.from(valueSet).sort();
  }

  for (const col of scalarColumns) {
    const valueSet = new Set<string>(baseOptions[col] ?? []);
    for (const row of rows) {
      const val = row[col] as string | null;
      if (val) valueSet.add(val.toLowerCase());
    }
    options[col] = Array.from(valueSet).sort();
  }

  return NextResponse.json(
    { options },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
