"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sendEmail, getAppUrl } from "@/lib/email";
import { InvitationEmail } from "@/lib/email/templates/invitation";
import { PaymentSentEmail } from "@/lib/email/templates/payment-sent";
import { CompanyReportReadyEmail } from "@/lib/email/templates/company-report-ready";
import { logDeveloperActivity } from "@/lib/admin/activity-log";
import type { Enums } from "@/types/database";

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

type ActionResult = { success: boolean; error?: string };

async function requireAdmin(): Promise<ActionResult | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== "admin") {
    return { success: false, error: "Unauthorized" };
  }
  return null;
}

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

  const { data: { user } } = await supabase.auth.getUser();
  logDeveloperActivity(supabase, developerId, user?.id ?? null, "updated_notes");

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

  const { data: { user } } = await supabase.auth.getUser();
  logDeveloperActivity(supabase, developerId, user?.id ?? null, "updated_availability", {
    is_available: isAvailable,
  });

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

  const { data: { user } } = await supabase.auth.getUser();
  logDeveloperActivity(supabase, developerId, user?.id ?? null, "updated_quality_rating", {
    rating,
  });

  revalidatePath("/admin/developers");
  return { success: true };
}

export async function updateDeveloperProfile(
  developerId: string,
  data: Record<string, unknown>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("developers")
    .update(data)
    .eq("id", developerId);

  if (error) return { success: false, error: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  logDeveloperActivity(supabase, developerId, user?.id ?? null, "edited_profile", {
    fields: Object.keys(data),
  });

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

  // Send report-ready email to company (best-effort)
  try {
    const { data: project } = await supabase
      .from("projects")
      .select("product_name, company_id")
      .eq("id", projectId)
      .single();

    if (project?.company_id) {
      const { data: contact } = await supabase
        .from("company_contacts")
        .select("profiles(email, full_name)")
        .eq("company_id", project.company_id)
        .eq("is_primary", true)
        .single();

      const profile = contact?.profiles as unknown as { email: string; full_name: string } | null;
      if (profile?.email) {
        await sendEmail({
          to: profile.email,
          subject: `Your findings report for ${project.product_name} is ready`,
          react: CompanyReportReadyEmail({
            contactName: profile.full_name || "there",
            projectName: project.product_name,
            projectUrl: `${getAppUrl()}/company/projects/${projectId}`,
          }),
          type: "report_ready",
          projectId,
        });
      }
    }
  } catch (err) {
    console.error("Failed to send report-ready email:", err);
  }

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

  const { data: evaluation, error } = await supabase
    .from("evaluations")
    .insert({
      project_id: projectId,
      developer_id: developerId,
      status: "invited",
      payout_amount: payoutAmount ?? 175,
      anonymous_descriptor: descriptor,
      invitation_expires_at: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // Send invitation email (best-effort)
  try {
    const { data: devProfile } = await supabase
      .from("developers")
      .select("imported, profiles(email, full_name)")
      .eq("id", developerId)
      .single();

    const { data: project } = await supabase
      .from("projects")
      .select("product_name")
      .eq("id", projectId)
      .single();

    const profile = devProfile?.profiles as unknown as { email: string; full_name: string } | null;
    const isImported = !!devProfile?.imported;

    if (profile?.email && project) {
      const subject = isImported
        ? `Tessa from Built for Devs — paid evaluation opportunity`
        : `You're invited to evaluate ${project.product_name}`;

      await sendEmail({
        to: profile.email,
        subject,
        react: InvitationEmail({
          developerName: profile.full_name || "Developer",
          productName: project.product_name,
          payoutAmount: payoutAmount ?? 129,
          evaluationUrl: `${getAppUrl()}/dev/evaluations/${evaluation.id}`,
          expiresIn: "24 hours",
          isImported,
        }),
        type: "invitation",
        recipientProfileId: undefined,
        evaluationId: evaluation.id,
        projectId,
      });
    }
  } catch (err) {
    console.error("Failed to send invitation email:", err);
  }

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

  // Send payment confirmation email (best-effort)
  try {
    const { data: ev } = await supabase
      .from("evaluations")
      .select("payout_amount, developer_id, project_id, projects(product_name)")
      .eq("id", evaluationId)
      .single();

    if (ev?.developer_id) {
      const { data: devProfile } = await supabase
        .from("developers")
        .select("profiles(email, full_name)")
        .eq("id", ev.developer_id)
        .single();

      const profile = devProfile?.profiles as unknown as { email: string; full_name: string } | null;
      const project = ev.projects as unknown as { product_name: string } | null;

      if (profile?.email) {
        await sendEmail({
          to: profile.email,
          subject: `Payment of $${ev.payout_amount} sent`,
          react: PaymentSentEmail({
            developerName: profile.full_name || "Developer",
            productName: project?.product_name || "Product",
            amount: ev.payout_amount ?? 175,
            payoutReference,
          }),
          type: "payment_confirmation",
          evaluationId,
          projectId: ev.project_id,
        });
      }
    }
  } catch (err) {
    console.error("Failed to send payment email:", err);
  }

  revalidatePath("/admin/evaluations");
  revalidatePath("/admin/projects");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function updateEvaluationClarityFlow(
  evaluationId: string,
  data: {
    clarityflow_conversation_id?: string | null;
    recording_embed_url?: string | null;
    transcript?: string | null;
  }
): Promise<ActionResult> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if ("clarityflow_conversation_id" in data)
    updateData.clarityflow_conversation_id = data.clarityflow_conversation_id || null;
  if ("recording_embed_url" in data)
    updateData.recording_embed_url = data.recording_embed_url || null;
  if ("transcript" in data) updateData.transcript = data.transcript || null;

  if (data.recording_embed_url || data.transcript) {
    updateData.recording_completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("evaluations")
    .update(updateData)
    .eq("id", evaluationId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/evaluations");
  revalidatePath("/admin/projects");
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
  const authErr = await requireAdmin();
  if (authErr) return { success: false, imported: 0, skipped: 0, errors: [authErr.error ?? "Unauthorized"] };

  const supabase = createServiceClient();
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

    // Create auth user via admin API (requires service role key)
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

// ============================================================
// FOLK CRM IMPORT
// ============================================================

export interface FolkImportContact {
  folk_person_id?: string;
  folk_group_id?: string;
  email: string;
  full_name: string;
  job_title?: string;
  current_company?: string;
  linkedin_url?: string;
  location?: string;
  seniority?: string;
  years_experience?: number;
  languages?: string[];
  role_types?: string[];
}

export async function importFromFolk(
  contacts: FolkImportContact[]
): Promise<{ success: boolean; imported: number; skipped: number; errors: string[]; developerIds: string[]; developerNames: Record<string, string> }> {
  const authErr = await requireAdmin();
  if (authErr) return { success: false, imported: 0, skipped: 0, errors: [authErr.error ?? "Unauthorized"], developerIds: [], developerNames: {} };

  const supabase = createServiceClient();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  const developerIds: string[] = [];
  const developerNames: Record<string, string> = {};

  for (const contact of contacts) {
    // Check for duplicate email
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", contact.email)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    // Create auth user via admin API
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: contact.email,
        email_confirm: true,
        user_metadata: {
          full_name: contact.full_name,
          role: "developer",
        },
      });

    if (authError) {
      errors.push(`${contact.email}: ${authError.message}`);
      continue;
    }

    if (!authUser.user) {
      errors.push(`${contact.email}: Failed to create user`);
      continue;
    }

    // Build developer fields from enrichment data
    const devFields: Record<string, unknown> = {
      imported: true,
      import_source: "folk",
    };

    if (contact.folk_person_id) devFields.folk_person_id = contact.folk_person_id;
    if (contact.folk_group_id) devFields.folk_group_id = contact.folk_group_id;

    if (contact.job_title) devFields.job_title = contact.job_title;
    if (contact.current_company) devFields.current_company = contact.current_company;
    if (contact.linkedin_url) devFields.linkedin_url = contact.linkedin_url;
    if (contact.location) devFields.country = contact.location;
    if (contact.seniority) devFields.seniority = contact.seniority;
    if (contact.years_experience) devFields.years_experience = contact.years_experience;
    if (contact.languages?.length) devFields.languages = contact.languages;
    if (contact.role_types?.length) devFields.role_types = contact.role_types;

    // Update the developer record (created by trigger)
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
      developerIds.push(devRecord.id);
      developerNames[devRecord.id] = contact.full_name;
    }

    imported++;
  }

  revalidatePath("/admin/developers");
  return { success: true, imported, skipped, errors, developerIds, developerNames };
}

// ============================================================
// SCORE MANAGEMENT
// ============================================================

export async function deleteScore(scoreId: string): Promise<ActionResult> {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  const supabase = createServiceClient();
  const { error } = await supabase.from("scores").delete().eq("id", scoreId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/scores");
  return { success: true };
}

export async function toggleScoreDirectoryHidden(
  scoreId: string,
  hidden: boolean
): Promise<ActionResult> {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("scores")
    .update({ directory_hidden: hidden })
    .eq("id", scoreId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/scores");
  return { success: true };
}

// ============================================================
// DELETE — DEVELOPERS & COMPANIES
// ============================================================

export async function deleteDeveloper(developerId: string): Promise<ActionResult> {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  const supabase = createServiceClient();

  // Get the profile_id to also remove auth user
  const { data: dev } = await supabase
    .from("developers")
    .select("profile_id")
    .eq("id", developerId)
    .single();

  // Delete the developer record
  const { error } = await supabase
    .from("developers")
    .delete()
    .eq("id", developerId);
  if (error) return { success: false, error: error.message };

  // Also remove the auth user if we have the profile_id
  if (dev?.profile_id) {
    await supabase.auth.admin.deleteUser(dev.profile_id);
  }

  revalidatePath("/admin/developers");
  return { success: true };
}

export async function deleteDevelopersInBulk(
  developerIds: string[]
): Promise<{ success: boolean; deleted: number; errors: string[] }> {
  const authErr = await requireAdmin();
  if (authErr) return { success: false, deleted: 0, errors: [authErr.error ?? "Unauthorized"] };

  const supabase = createServiceClient();
  let deleted = 0;
  const errors: string[] = [];

  for (const id of developerIds) {
    const { data: dev } = await supabase
      .from("developers")
      .select("profile_id, profiles(full_name)")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("developers")
      .delete()
      .eq("id", id);

    if (error) {
      errors.push(`${id}: ${error.message}`);
      continue;
    }

    if (dev?.profile_id) {
      await supabase.auth.admin.deleteUser(dev.profile_id);
    }
    deleted++;
  }

  revalidatePath("/admin/developers");
  return { success: true, deleted, errors };
}

export async function deleteCompany(companyId: string): Promise<ActionResult> {
  const authErr = await requireAdmin();
  if (authErr) return authErr;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/companies");
  return { success: true };
}
