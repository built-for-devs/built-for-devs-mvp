import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function getDevProfile(supabase: Client) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: developer } = await supabase
    .from("developers")
    .select("*, profiles!inner(full_name, email, avatar_url)")
    .eq("profile_id", user.id)
    .single();

  return developer;
}

export async function getDevEvaluations(supabase: Client) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Use the developer_evaluations_view which is scoped by RLS
  const { data } = await supabase
    .from("developer_evaluations_view")
    .select("*")
    .order("invited_at", { ascending: false });

  return data ?? [];
}

export async function getDevEvaluation(supabase: Client, evalId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error("getDevEvaluation: no authenticated user");
    return null;
  }

  const { data: dev, error: devError } = await supabase
    .from("developers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (devError) {
    console.error("getDevEvaluation: developer lookup failed:", devError.message);
    return null;
  }
  if (!dev) return null;

  const { data: evaluation, error: evalError } = await supabase
    .from("evaluations")
    .select(
      "*, projects(product_name, product_description, product_url, evaluation_scope, setup_instructions, time_to_value_milestone, goals)"
    )
    .eq("id", evalId)
    .eq("developer_id", dev.id)
    .single();

  if (evalError) {
    console.error("getDevEvaluation: evaluation query failed:", evalError.message);
    return null;
  }

  return evaluation;
}
