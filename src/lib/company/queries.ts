import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function getCompanyForUser(supabase: Client) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: contact } = await supabase
    .from("company_contacts")
    .select("*, companies(*)")
    .eq("profile_id", user.id)
    .single();

  if (!contact) return null;

  return {
    contact,
    company: (contact as Record<string, unknown>).companies as Database["public"]["Tables"]["companies"]["Row"],
  };
}

export async function getCompanyProjects(supabase: Client) {
  const companyData = await getCompanyForUser(supabase);
  if (!companyData) return { company: null, projects: [] };

  const { data: projects } = await supabase
    .from("projects")
    .select("*, evaluations(id, status)")
    .eq("company_id", companyData.company.id)
    .order("created_at", { ascending: false });

  const projectsWithCounts = (projects ?? []).map((project) => {
    const evals = (project as Record<string, unknown>).evaluations as
      | { id: string; status: string }[]
      | null;
    const totalEvaluations = evals?.length ?? 0;
    const completedEvaluations =
      evals?.filter((e) =>
        ["approved", "paid"].includes(e.status)
      ).length ?? 0;
    return {
      ...project,
      evaluations: undefined,
      totalEvaluations,
      completedEvaluations,
    };
  });

  return { company: companyData.company, projects: projectsWithCounts };
}

export async function getCompanyProject(supabase: Client, projectId: string) {
  const companyData = await getCompanyForUser(supabase);
  if (!companyData) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("company_id", companyData.company.id)
    .single();

  if (!project) return null;

  // Use the company_evaluations_view for column-restricted access
  const { data: evaluations } = await supabase
    .from("company_evaluations_view")
    .select("*")
    .eq("project_id", projectId)
    .order("recording_completed_at", { ascending: false });

  return { project, evaluations: evaluations ?? [] };
}

export async function getCompanyEvaluation(
  supabase: Client,
  projectId: string,
  evalId: string
) {
  const companyData = await getCompanyForUser(supabase);
  if (!companyData) return null;

  // Verify project belongs to company
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", companyData.company.id)
    .single();

  if (!project) return null;

  const { data: evaluation } = await supabase
    .from("company_evaluations_view")
    .select("*")
    .eq("id", evalId)
    .eq("project_id", projectId)
    .single();

  return evaluation;
}
