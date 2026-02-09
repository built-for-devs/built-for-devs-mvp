"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type ActionResult = { success: boolean; error?: string };

export async function updateProfile(
  data: Omit<
    TablesUpdate<"developers">,
    | "id"
    | "profile_id"
    | "admin_notes"
    | "quality_rating"
    | "total_evaluations"
    | "response_rate"
    | "imported"
    | "import_source"
    | "created_at"
    | "updated_at"
  >
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: dev } = await supabase
    .from("developers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!dev) return { success: false, error: "Developer record not found" };

  const { error } = await supabase
    .from("developers")
    .update(data)
    .eq("id", dev.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dev/profile");
  return { success: true };
}

export async function acceptInvitation(
  evaluationId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: dev } = await supabase
    .from("developers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!dev) return { success: false, error: "Developer record not found" };

  // Validate evaluation belongs to this developer and is in invited status
  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, status")
    .eq("id", evaluationId)
    .eq("developer_id", dev.id)
    .eq("status", "invited")
    .single();

  if (!evaluation)
    return { success: false, error: "Invitation not found or already responded" };

  const { error } = await supabase
    .from("evaluations")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
      recording_deadline: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq("id", evaluationId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dev/evaluations");
  return { success: true };
}

export async function declineInvitation(
  evaluationId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: dev } = await supabase
    .from("developers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!dev) return { success: false, error: "Developer record not found" };

  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("id, status")
    .eq("id", evaluationId)
    .eq("developer_id", dev.id)
    .eq("status", "invited")
    .single();

  if (!evaluation)
    return { success: false, error: "Invitation not found or already responded" };

  const { error } = await supabase
    .from("evaluations")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", evaluationId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dev/evaluations");
  return { success: true };
}
