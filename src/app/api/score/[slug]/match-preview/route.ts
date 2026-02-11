import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formatEnumLabel } from "@/lib/admin/filter-options";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface MatchPreviewRequest {
  role_types?: string[];
  seniority_levels?: string[];
  languages?: string[];
  min_experience?: number;
  frameworks?: string[];
  databases?: string[];
  cloud_platforms?: string[];
  industries?: string[];
  devops_tools?: string[];
  cicd_tools?: string[];
  testing_frameworks?: string[];
  api_experience?: string[];
  operating_systems?: string[];
  company_size?: string[];
  buying_influence?: string[];
  paid_tools?: string[];
  open_source_activity?: string[];
}

interface AnonymizedDeveloper {
  descriptor: string;
  experience: string;
  topSkills: string[];
  seniority: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await request.json()) as MatchPreviewRequest;

  const supabase = createServiceClient();

  // Verify score exists and is complete
  const { data: score } = await supabase
    .from("scores")
    .select("id")
    .eq("slug", slug)
    .eq("status", "complete")
    .single();

  if (!score) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  // Build developer match query — don't require profile_complete or is_available
  // since the network is still growing. Show all developers who have profiles.
  let query = (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
    .from("developers")
    .select("job_title, years_experience, seniority, languages, frameworks, role_types", { count: "exact" });

  // Apply array overlap filters
  if (body.role_types?.length) {
    query = query.overlaps("role_types", body.role_types);
  }
  if (body.seniority_levels?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("seniority", body.seniority_levels as any);
  }
  if (body.languages?.length) {
    query = query.overlaps("languages", body.languages);
  }
  if (body.min_experience !== undefined && body.min_experience > 0) {
    query = query.gte("years_experience", body.min_experience);
  }
  if (body.frameworks?.length) {
    query = query.overlaps("frameworks", body.frameworks);
  }
  if (body.databases?.length) {
    query = query.overlaps("databases", body.databases);
  }
  if (body.cloud_platforms?.length) {
    query = query.overlaps("cloud_platforms", body.cloud_platforms);
  }
  if (body.industries?.length) {
    query = query.overlaps("industries", body.industries);
  }
  if (body.devops_tools?.length) {
    query = query.overlaps("devops_tools", body.devops_tools);
  }
  if (body.cicd_tools?.length) {
    query = query.overlaps("cicd_tools", body.cicd_tools);
  }
  if (body.testing_frameworks?.length) {
    query = query.overlaps("testing_frameworks", body.testing_frameworks);
  }
  if (body.api_experience?.length) {
    query = query.overlaps("api_experience", body.api_experience);
  }
  if (body.operating_systems?.length) {
    query = query.overlaps("operating_systems", body.operating_systems);
  }
  if (body.company_size?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("company_size", body.company_size as any);
  }
  if (body.buying_influence?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("buying_influence", body.buying_influence as any);
  }
  if (body.paid_tools?.length) {
    query = query.overlaps("paid_tools", body.paid_tools);
  }
  if (body.open_source_activity?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("open_source_activity", body.open_source_activity as any);
  }

  query = query.limit(6);

  const { data, count, error } = await query;

  if (error) {
    console.error("Match preview query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // Anonymize developer data
  const samples: AnonymizedDeveloper[] = (data ?? []).map((dev: Record<string, unknown>) => {
    const roleTypes = (dev.role_types as string[]) ?? [];
    const seniority = (dev.seniority as string) ?? "senior";
    const primaryRole = roleTypes[0] ?? "developer";

    // Build descriptor like "Senior Backend Engineer"
    const seniorityLabel = formatEnumLabel(seniority);
    const roleLabel = formatEnumLabel(primaryRole);
    const descriptor = `${seniorityLabel} ${roleLabel} Engineer`;

    const years = dev.years_experience as number | null;
    const langs = ((dev.languages as string[]) ?? []).slice(0, 3).map(formatEnumLabel);
    const fws = ((dev.frameworks as string[]) ?? []).slice(0, 2).map(formatEnumLabel);
    const topSkills = [...langs, ...fws].slice(0, 4);

    return {
      descriptor,
      experience: years ? `${years} years` : "N/A",
      topSkills,
      seniority: seniorityLabel,
    };
  });

  return NextResponse.json({
    totalMatches: count ?? 0,
    samples,
  });
}
