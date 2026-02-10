"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import type { Enums } from "@/types/database";

type ActionResult = { success: boolean; error?: string };

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function createCompanyAndContact(data: {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
}): Promise<{ success: boolean; error?: string; companyId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Use service client to bypass RLS for onboarding writes
  const admin = getServiceClient();

  // Check if user already has a company
  const { data: existing } = await admin
    .from("company_contacts")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (existing) return { success: false, error: "You already have a company" };

  // Create company
  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: data.name,
      website: data.website || null,
      industry: data.industry || null,
      size: data.size || null,
    })
    .select("id")
    .single();

  if (companyError) return { success: false, error: companyError.message };

  // Create company_contact linking user to company
  const { error: contactError } = await admin
    .from("company_contacts")
    .insert({
      company_id: company.id,
      profile_id: user.id,
      is_primary: true,
    });

  if (contactError) return { success: false, error: contactError.message };

  revalidatePath("/company/projects");
  return { success: true, companyId: company.id };
}

export async function createProject(data: {
  company_id: string;
  product_name: string;
  product_url?: string;
  product_category?: string;
  product_description?: string;
  evaluation_scope?: string;
  setup_instructions?: string;
  time_to_value_milestone?: string;
  goals?: string[];
  num_evaluations: number;
  preferred_timeline?: string;
  // ICP fields
  icp_role_types?: string[];
  icp_min_experience?: number;
  icp_seniority_levels?: string[];
  icp_languages?: string[];
  icp_frameworks?: string[];
  icp_databases?: string[];
  icp_cloud_platforms?: string[];
  icp_devops_tools?: string[];
  icp_cicd_tools?: string[];
  icp_testing_frameworks?: string[];
  icp_api_experience?: string[];
  icp_operating_systems?: string[];
  icp_company_size_range?: string[];
  icp_industries?: string[];
  icp_team_size_range?: string[];
  icp_buying_influence?: string[];
  icp_paid_tools?: string[];
  icp_open_source_activity?: string[];
}): Promise<{ success: boolean; error?: string; projectId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const price_per_evaluation = 399;
  const total_price = data.num_evaluations * price_per_evaluation;

  // Verify user owns this company
  const admin = getServiceClient();
  const { data: contact } = await admin
    .from("company_contacts")
    .select("company_id")
    .eq("profile_id", user.id)
    .eq("company_id", data.company_id)
    .maybeSingle();

  if (!contact) return { success: false, error: "Not authorized for this company" };

  const { data: project, error } = await admin
    .from("projects")
    .insert({
      company_id: data.company_id,
      product_name: data.product_name,
      product_url: data.product_url || null,
      product_category: data.product_category || null,
      product_description: data.product_description || null,
      evaluation_scope: data.evaluation_scope || null,
      setup_instructions: data.setup_instructions || null,
      time_to_value_milestone: data.time_to_value_milestone || null,
      goals: data.goals?.length ? data.goals : null,
      num_evaluations: data.num_evaluations,
      price_per_evaluation,
      total_price,
      preferred_timeline: data.preferred_timeline || null,
      status: "draft" as Enums<"project_status">,
      // ICP fields
      icp_role_types: data.icp_role_types?.length ? data.icp_role_types : null,
      icp_min_experience: data.icp_min_experience ?? null,
      icp_seniority_levels: data.icp_seniority_levels?.length ? data.icp_seniority_levels : null,
      icp_languages: data.icp_languages?.length ? data.icp_languages : null,
      icp_frameworks: data.icp_frameworks?.length ? data.icp_frameworks : null,
      icp_databases: data.icp_databases?.length ? data.icp_databases : null,
      icp_cloud_platforms: data.icp_cloud_platforms?.length ? data.icp_cloud_platforms : null,
      icp_devops_tools: data.icp_devops_tools?.length ? data.icp_devops_tools : null,
      icp_cicd_tools: data.icp_cicd_tools?.length ? data.icp_cicd_tools : null,
      icp_testing_frameworks: data.icp_testing_frameworks?.length ? data.icp_testing_frameworks : null,
      icp_api_experience: data.icp_api_experience?.length ? data.icp_api_experience : null,
      icp_operating_systems: data.icp_operating_systems?.length ? data.icp_operating_systems : null,
      icp_company_size_range: data.icp_company_size_range?.length ? data.icp_company_size_range : null,
      icp_industries: data.icp_industries?.length ? data.icp_industries : null,
      icp_team_size_range: data.icp_team_size_range?.length ? data.icp_team_size_range : null,
      icp_buying_influence: data.icp_buying_influence?.length ? data.icp_buying_influence : null,
      icp_paid_tools: data.icp_paid_tools?.length ? data.icp_paid_tools : null,
      icp_open_source_activity: data.icp_open_source_activity?.length ? data.icp_open_source_activity : null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/company/projects");
  return { success: true, projectId: project.id };
}

export async function createCheckoutSession(
  projectId: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify project belongs to user's company
  const { data: contact } = await supabase
    .from("company_contacts")
    .select("company_id")
    .eq("profile_id", user.id)
    .single();

  if (!contact) return { success: false, error: "No company found" };

  const { data: project } = await supabase
    .from("projects")
    .select("id, product_name, num_evaluations, total_price, status")
    .eq("id", projectId)
    .eq("company_id", contact.company_id)
    .single();

  if (!project) return { success: false, error: "Project not found" };
  if (project.status !== "draft")
    return { success: false, error: "Project is not in draft status" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Developer Evaluations: ${project.product_name}`,
            description: `${project.num_evaluations} developer evaluations at $399 each`,
          },
          unit_amount: 39900, // $399 in cents
        },
        quantity: project.num_evaluations,
      },
    ],
    metadata: {
      project_id: project.id,
    },
    success_url: `${baseUrl}/company/projects/${project.id}?payment=success`,
    cancel_url: `${baseUrl}/company/projects/${project.id}?payment=cancelled`,
  });

  return { success: true, url: session.url ?? undefined };
}
