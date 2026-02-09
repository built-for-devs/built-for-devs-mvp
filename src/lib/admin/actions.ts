"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

type ActionResult = { success: boolean; error?: string };

// ============================================================
// DEVELOPERS
// ============================================================

export async function updateDeveloperNotes(
  developerId: string,
  notes: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("developers")
    .update({ admin_notes: notes })
    .eq("id", developerId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/developers");
  return { success: true };
}

export async function updateDeveloperAvailability(
  developerId: string,
  isAvailable: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("developers")
    .update({ is_available: isAvailable })
    .eq("id", developerId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/developers");
  return { success: true };
}

export async function updateDeveloperQualityRating(
  developerId: string,
  rating: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("developers")
    .update({ quality_rating: rating })
    .eq("id", developerId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/developers");
  return { success: true };
}

export async function updateDeveloperProfile(
  developerId: string,
  data: {
    job_title?: string;
    current_company?: string;
    country?: string;
    state_region?: string;
    timezone?: string;
    years_experience?: number;
    linkedin_url?: string;
    github_url?: string;
    paypal_email?: string;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("developers")
    .update(data)
    .eq("id", developerId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/developers/${developerId}`);
  revalidatePath("/admin/developers");
  return { success: true };
}

// ============================================================
// PROJECTS
// ============================================================

export async function updateProjectStatus(
  projectId: string,
  status: Enums<"project_status">
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status })
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/projects");
  return { success: true };
}

export async function updateProjectNotes(
  projectId: string,
  notes: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ admin_notes: notes })
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/projects");
  return { success: true };
}

export async function saveFindings(
  projectId: string,
  report: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ findings_report: report })
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return { success: true };
}

export async function publishFindings(projectId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      report_published: true,
      report_published_at: new Date().toISOString(),
      status: "delivered" as Enums<"project_status">,
    })
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return { success: true };
}

export async function createProject(data: {
  company_id: string;
  product_name: string;
  product_description?: string;
  product_url?: string;
  product_category?: string;
  num_evaluations: number;
  price_per_evaluation: number;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const total_price = data.num_evaluations * data.price_per_evaluation;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      company_id: data.company_id,
      product_name: data.product_name,
      product_description: data.product_description || null,
      product_url: data.product_url || null,
      product_category: data.product_category || null,
      num_evaluations: data.num_evaluations,
      price_per_evaluation: data.price_per_evaluation,
      total_price,
      status: "draft" as Enums<"project_status">,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/projects");
  return { success: true, id: project.id };
}

export async function updateProject(
  projectId: string,
  data: {
    product_name?: string;
    product_description?: string;
    product_url?: string;
    product_category?: string;
    num_evaluations?: number;
    price_per_evaluation?: number;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const updates: Record<string, unknown> = { ...data };

  if (data.num_evaluations !== undefined && data.price_per_evaluation !== undefined) {
    updates.total_price = data.num_evaluations * data.price_per_evaluation;
  }

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin/projects");
  return { success: true };
}

// ============================================================
// EVALUATIONS
// ============================================================

export async function assignDeveloperToProject(
  projectId: string,
  developerId: string,
  payoutAmount?: number
): Promise<ActionResult> {
  const supabase = await createClient();

  // Generate anonymous descriptor from developer profile
  const { data: dev } = await supabase
    .from("developers")
    .select("seniority, years_experience, industries, current_company, role_types, profiles(full_name)")
    .eq("id", developerId)
    .single();

  let descriptor = "Developer";
  if (dev) {
    const parts: string[] = [];
    if (dev.seniority) parts.push(dev.seniority.replace(/_/g, " "));
    if (dev.role_types?.length) parts.push(dev.role_types[0]);
    if (dev.years_experience) parts.push(`${dev.years_experience} yrs exp`);
    if (dev.industries?.length) parts.push(dev.industries[0]);
    descriptor = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ");
  }

  const { error } = await supabase.from("evaluations").insert({
    project_id: projectId,
    developer_id: developerId,
    status: "invited",
    payout_amount: payoutAmount ?? 175,
    anonymous_descriptor: descriptor,
    invitation_expires_at: new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return { success: true };
}

export async function removeEvaluation(
  evaluationId: string,
  projectId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluations")
    .delete()
    .eq("id", evaluationId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/admin/projects/${projectId}`);
  return { success: true };
}

export async function updateEvaluationStatus(
  evaluationId: string,
  status: Enums<"evaluation_status">
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluations")
    .update({ status })
    .eq("id", evaluationId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/evaluations");
  revalidatePath("/admin/projects");
  return { success: true };
}

export async function reviewEvaluation(
  evaluationId: string,
  qualityScore: number,
  reviewNotes: string,
  approved: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluations")
    .update({
      admin_quality_score: qualityScore,
      admin_review_notes: reviewNotes,
      reviewed_at: new Date().toISOString(),
      status: approved ? "approved" : "rejected",
    })
    .eq("id", evaluationId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/evaluations");
  revalidatePath("/admin/projects");
  return { success: true };
}

export async function logPayment(
  evaluationId: string,
  payoutReference: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("evaluations")
    .update({
      paid_at: new Date().toISOString(),
      payout_reference: payoutReference,
      payout_method: "paypal_manual",
      status: "paid" as Enums<"evaluation_status">,
    })
    .eq("id", evaluationId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/evaluations");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// ============================================================
// COMPANIES
// ============================================================

export async function updateCompanyNotes(
  companyId: string,
  notes: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({ admin_notes: notes })
    .eq("id", companyId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/companies");
  return { success: true };
}

export async function createCompany(data: {
  name: string;
  website?: string;
  industry?: string;
  size?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      name: data.name,
      website: data.website || null,
      industry: data.industry || null,
      size: data.size || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/companies");
  return { success: true, id: company.id };
}

export async function updateCompany(
  companyId: string,
  data: {
    name?: string;
    website?: string;
    industry?: string;
    size?: string;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update(data)
    .eq("id", companyId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${companyId}`);
  return { success: true };
}

// ============================================================
// DEVELOPER IMPORT
// ============================================================

export async function importDevelopers(
  rows: {
    email: string;
    full_name: string;
    [key: string]: unknown;
  }[],
  importSource: string
): Promise<{ success: boolean; imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    // Check for duplicate email
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", row.email)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Create auth user via admin API (this triggers the handle_new_user trigger)
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: row.email,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name,
          role: "developer",
        },
      });

    if (authError) {
      errors.push(`${row.email}: ${authError.message}`);
      continue;
    }

    if (!authUser.user) {
      errors.push(`${row.email}: Failed to create user`);
      continue;
    }

    // Update the developer record with additional fields from import
    const devFields: Record<string, unknown> = {
      imported: true,
      import_source: importSource,
    };

    const fieldMap: Record<string, string> = {
      job_title: "job_title",
      current_company: "current_company",
      country: "country",
      state_region: "state_region",
      timezone: "timezone",
      linkedin_url: "linkedin_url",
      github_url: "github_url",
      twitter_url: "twitter_url",
      website_url: "website_url",
      paypal_email: "paypal_email",
    };

    for (const [csvKey, dbKey] of Object.entries(fieldMap)) {
      if (row[csvKey] && typeof row[csvKey] === "string") {
        devFields[dbKey] = row[csvKey];
      }
    }

    // Array fields
    const arrayFields = [
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
    ];

    for (const field of arrayFields) {
      if (row[field]) {
        if (Array.isArray(row[field])) {
          devFields[field] = row[field];
        } else if (typeof row[field] === "string") {
          devFields[field] = (row[field] as string).split(",").map((s) => s.trim());
        }
      }
    }

    // Number fields
    if (row.years_experience) {
      const n = parseInt(String(row.years_experience), 10);
      if (!isNaN(n)) devFields.years_experience = n;
    }
    if (row.team_size) {
      const n = parseInt(String(row.team_size), 10);
      if (!isNaN(n)) devFields.team_size = n;
    }

    // Enum fields
    if (row.seniority) devFields.seniority = row.seniority;
    if (row.company_size) devFields.company_size = row.company_size;
    if (row.buying_influence) devFields.buying_influence = row.buying_influence;
    if (row.open_source_activity) devFields.open_source_activity = row.open_source_activity;

    if (Object.keys(devFields).length > 2) {
      // More than just imported + import_source
      const { data: devRecord } = await supabase
        .from("developers")
        .select("id")
        .eq("profile_id", authUser.user.id)
        .single();

      if (devRecord) {
        await supabase
          .from("developers")
          .update(devFields)
          .eq("id", devRecord.id);
      }
    }

    imported++;
  }

  revalidatePath("/admin/developers");
  return { success: true, imported, skipped, errors };
}
