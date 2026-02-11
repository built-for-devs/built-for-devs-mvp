import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  DashboardStats,
  DeveloperFilters,
  DeveloperWithProfile,
  ProjectFilters,
  ProjectWithCompany,
  EvaluationFilters,
  EvaluationWithRelations,
  ScoreFilters,
} from "@/types/admin";

type Client = SupabaseClient<Database>;

// ============================================================
// DASHBOARD
// ============================================================

export async function getDashboardStats(supabase: Client): Promise<DashboardStats> {
  const [devTotal, devComplete, companies, activeProjects, needsReview, needsPayment] =
    await Promise.all([
      supabase
        .from("developers")
        .select("*, profiles!inner(role)", { count: "exact", head: true })
        .neq("profiles.role", "admin"),
      supabase
        .from("developers")
        .select("*, profiles!inner(role)", { count: "exact", head: true })
        .neq("profiles.role", "admin")
        .eq("profile_complete", true),
      supabase.from("companies").select("*", { count: "exact", head: true }),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .not("status", "in", '("draft","closed","delivered")'),
      supabase
        .from("evaluations")
        .select("*", { count: "exact", head: true })
        .in("status", ["submitted", "in_review"]),
      supabase
        .from("evaluations")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);

  return {
    totalDevelopers: devTotal.count ?? 0,
    completedProfiles: devComplete.count ?? 0,
    totalCompanies: companies.count ?? 0,
    activeProjects: activeProjects.count ?? 0,
    evaluationsNeedingReview: needsReview.count ?? 0,
    evaluationsNeedingPayment: needsPayment.count ?? 0,
  };
}

// Sonnet pricing: $3/1M input, $15/1M output
const SONNET_INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const SONNET_OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

export async function getScoreStats(supabase: Client) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  const [completedResult, tokenResult] = await Promise.all([
    client
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("status", "complete"),
    client
      .from("scores")
      .select("input_tokens, output_tokens")
      .eq("status", "complete")
      .not("input_tokens", "is", null),
  ]);

  const totalScores = completedResult.count ?? 0;
  const rows = (tokenResult.data ?? []) as { input_tokens: number; output_tokens: number }[];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  for (const row of rows) {
    totalInputTokens += row.input_tokens ?? 0;
    totalOutputTokens += row.output_tokens ?? 0;
  }
  const totalCost =
    totalInputTokens * SONNET_INPUT_COST_PER_TOKEN +
    totalOutputTokens * SONNET_OUTPUT_COST_PER_TOKEN;

  return { totalScores, totalInputTokens, totalOutputTokens, totalCost };
}

export async function getNeedsAttentionProjects(supabase: Client) {
  const { data } = await supabase
    .from("projects")
    .select("id, product_name, status, num_evaluations, created_at, companies(name)")
    .not("status", "in", '("draft","closed","delivered")')
    .order("created_at", { ascending: true })
    .limit(10);
  return data ?? [];
}

export async function getNeedsReviewEvaluations(supabase: Client) {
  const { data } = await supabase
    .from("evaluations")
    .select(
      "id, project_id, status, recording_completed_at, developers(id, profile_id, profiles(full_name)), projects(product_name)"
    )
    .in("status", ["submitted", "in_review"])
    .order("recording_completed_at", { ascending: true })
    .limit(10);
  return data ?? [];
}

export async function getNeedsPaymentEvaluations(supabase: Client) {
  const { data } = await supabase
    .from("evaluations")
    .select(
      "id, project_id, payout_amount, developers(id, profile_id, paypal_email, profiles(full_name)), projects(product_name)"
    )
    .eq("status", "approved")
    .order("reviewed_at", { ascending: true })
    .limit(10);
  return data ?? [];
}

// ============================================================
// DEVELOPERS
// ============================================================

export async function getDevelopersWithProfiles(
  supabase: Client,
  filters: DeveloperFilters
): Promise<{ data: DeveloperWithProfile[]; count: number }> {
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("developers")
    .select("*, profiles!inner(full_name, email, avatar_url)", { count: "exact" })
    .neq("profiles.role", "admin");

  // Text search across profile name, company, job title
  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `job_title.ilike.${s},current_company.ilike.${s},profiles.full_name.ilike.${s}`
    );
  }

  // Boolean filter
  if (filters.is_available !== undefined) {
    query = query.eq("is_available", filters.is_available);
  }

  // Enum filters — cast through `any` because filter values arrive as plain strings
  // from URL search params but Supabase expects the narrow enum literal types
  if (filters.seniority?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("seniority", filters.seniority as any);
  }
  if (filters.company_size?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("company_size", filters.company_size as any);
  }
  if (filters.buying_influence?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("buying_influence", filters.buying_influence as any);
  }
  if (filters.open_source_activity?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.in("open_source_activity", filters.open_source_activity as any);
  }

  // Range filters
  if (filters.min_experience !== undefined) {
    query = query.gte("years_experience", filters.min_experience);
  }
  if (filters.max_experience !== undefined) {
    query = query.lte("years_experience", filters.max_experience);
  }

  // Array overlap filters (text[] columns — uses && operator)
  const arrayFilters: [keyof DeveloperFilters, string][] = [
    ["role_types", "role_types"],
    ["languages", "languages"],
    ["frameworks", "frameworks"],
    ["databases", "databases"],
    ["cloud_platforms", "cloud_platforms"],
    ["devops_tools", "devops_tools"],
    ["cicd_tools", "cicd_tools"],
    ["testing_frameworks", "testing_frameworks"],
    ["api_experience", "api_experience"],
    ["operating_systems", "operating_systems"],
    ["industries", "industries"],
    ["paid_tools", "paid_tools"],
  ];

  for (const [filterKey, column] of arrayFilters) {
    const values = filters[filterKey] as string[] | undefined;
    if (values?.length) {
      query = query.overlaps(column, values);
    }
  }

  // Pagination and ordering
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error("getDevelopersWithProfiles error:", error);
    return { data: [], count: 0 };
  }

  return {
    data: (data as unknown as DeveloperWithProfile[]) ?? [],
    count: count ?? 0,
  };
}

export async function getDeveloperById(supabase: Client, id: string) {
  const { data: developer } = await supabase
    .from("developers")
    .select("*, profiles!inner(full_name, email, avatar_url)")
    .eq("id", id)
    .single();

  if (!developer) return null;

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("*, projects(product_name, companies(name))")
    .eq("developer_id", id)
    .order("created_at", { ascending: false });

  return {
    developer: developer as unknown as DeveloperWithProfile,
    evaluations: evaluations ?? [],
  };
}

// ============================================================
// PROJECTS
// ============================================================

export async function getProjects(
  supabase: Client,
  filters: ProjectFilters
): Promise<{ data: ProjectWithCompany[]; count: number }> {
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("projects")
    .select("*, companies!inner(name, website)", { count: "exact" });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(`product_name.ilike.${s},companies.name.ilike.${s}`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("getProjects error:", error);
    return { data: [], count: 0 };
  }

  return {
    data: (data as unknown as ProjectWithCompany[]) ?? [],
    count: count ?? 0,
  };
}

export async function getProjectById(supabase: Client, id: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("*, companies(name, website)")
    .eq("id", id)
    .single();

  if (!project) return null;

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select(
      "*, developers(id, profile_id, paypal_email, profiles(full_name, email))"
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return {
    project: project as unknown as ProjectWithCompany,
    evaluations: (evaluations as unknown as EvaluationWithRelations[]) ?? [],
  };
}

// ============================================================
// EVALUATIONS
// ============================================================

export async function getEvaluations(
  supabase: Client,
  filters: EvaluationFilters
): Promise<{ data: EvaluationWithRelations[]; count: number }> {
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from("evaluations")
    .select(
      "*, developers!inner(id, profile_id, paypal_email, profiles!inner(full_name, email)), projects!inner(product_name, companies!inner(name))",
      { count: "exact" }
    );

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `developers.profiles.full_name.ilike.${s},projects.product_name.ilike.${s}`
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("getEvaluations error:", error);
    return { data: [], count: 0 };
  }

  return {
    data: (data as unknown as EvaluationWithRelations[]) ?? [],
    count: count ?? 0,
  };
}

// ============================================================
// COMPANIES
// ============================================================

export async function getCompanies(supabase: Client) {
  const { data } = await supabase
    .from("companies")
    .select("*, projects(id, total_price, status)")
    .order("created_at", { ascending: false });

  return (data ?? []).map((company) => {
    const projects = (company as Record<string, unknown>).projects as
      | { id: string; total_price: number | null; status: string }[]
      | null;
    const projectCount = projects?.length ?? 0;
    const totalSpend =
      projects
        ?.filter((p) => p.status !== "draft")
        .reduce((sum, p) => sum + (p.total_price ?? 0), 0) ?? 0;
    return { ...company, projectCount, totalSpend, projects: undefined };
  });
}

export async function getCompanyById(supabase: Client, id: string) {
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (!company) return null;

  const [{ data: projects }, { data: contacts }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_contacts")
      .select("*, profiles(full_name, email)")
      .eq("company_id", id),
  ]);

  return {
    company,
    projects: projects ?? [],
    contacts: contacts ?? [],
  };
}

// ============================================================
// SCORES
// ============================================================

export async function getScores(
  supabase: Client,
  filters: ScoreFilters
): Promise<{ data: Record<string, unknown>[]; count: number }> {
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // scores table is not in generated types yet — use untyped client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;

  let query = client
    .from("scores")
    .select(
      "id, slug, email, name, company_name, target_url, target_domain, final_score, classification, status, error_message, processing_time_ms, created_at, completed_at",
      { count: "exact" }
    );

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.search) {
    const s = `%${filters.search}%`;
    query = query.or(
      `email.ilike.${s},target_domain.ilike.${s},company_name.ilike.${s},name.ilike.${s}`
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) {
    console.error("getScores error:", error);
    return { data: [], count: 0 };
  }

  return {
    data: (data as unknown as Record<string, unknown>[]) ?? [],
    count: count ?? 0,
  };
}
