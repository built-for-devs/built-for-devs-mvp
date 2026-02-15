import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Auto-create a company user account for a buyer so they can
 * track their evaluations without a separate signup step.
 * Idempotent — skips if a profile with this email already exists.
 */
export async function ensureBuyerAccount(
  supabase: SupabaseClient,
  buyerEmail: string,
  buyerName: string | null,
  companyId: string,
  projectId: string
): Promise<boolean> {
  // Check if user already exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", buyerEmail)
    .maybeSingle();

  if (existingProfile) return true; // Account already exists

  // Create user (no password — they'll set it via forgot-password)
  const { data: userData, error: createError } =
    await supabase.auth.admin.createUser({
      email: buyerEmail,
      email_confirm: true,
      user_metadata: {
        role: "company",
        full_name: buyerName || "",
      },
    });

  if (createError || !userData?.user) {
    console.error("Failed to create buyer account:", createError?.message);
    return false;
  }

  // Create company_contacts record linking user to company
  const { data: contact } = await supabase
    .from("company_contacts")
    .insert({
      profile_id: userData.user.id,
      company_id: companyId,
      is_primary: true,
    })
    .select("id")
    .single();

  // Link project to the new company contact
  if (contact) {
    await supabase
      .from("projects")
      .update({ created_by: contact.id })
      .eq("id", projectId);
  }

  return true;
}
