"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  createConversation,
  buildEmbedUrl,
  buildConversationUrl,
} from "@/lib/clarityflow";
import { sendEmail, getAppUrl } from "@/lib/email";
import { AcceptanceConfirmationEmail } from "@/lib/email/templates/acceptance-confirmation";
import type { TablesUpdate } from "@/types/database";

type ActionResult = { success: boolean; error?: string };

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

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
    .select("id, status, projects(product_name)")
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

  // Create ClarityFlow conversation (best-effort — don't fail the accept if this errors)
  try {
    const project = evaluation.projects as unknown as { product_name: string } | null;
    const productName = project?.product_name ?? "Product";
    const slug = `eval-${evaluationId}`;

    const conversation = await createConversation(
      `Evaluation: ${productName}`,
      slug,
      { anyone_can_post: true, allow_anonymous_messages: true }
    );

    // Use service client to update fields developer RLS can't write
    const admin = getAdminClient();
    await admin
      .from("evaluations")
      .update({
        clarityflow_conversation_id: conversation.slug,
        recording_embed_url: conversation.conversation_embed_url || buildEmbedUrl(slug),
      })
      .eq("id", evaluationId);
  } catch (err) {
    console.error("ClarityFlow conversation creation failed:", err);
    // Invitation is still accepted — admin can set ClarityFlow fields manually
  }

  // Send acceptance confirmation email (best-effort)
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    const project = evaluation.projects as unknown as { product_name: string } | null;
    const productName = project?.product_name ?? "Product";
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const cfSlug = `eval-${evaluationId}`;

    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: `You're in! Next steps for ${productName}`,
        react: AcceptanceConfirmationEmail({
          developerName: profile.full_name || "Developer",
          productName,
          recordingUrl: buildConversationUrl(cfSlug),
          deadline: deadline.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
        }),
        type: "acceptance_confirmation",
        recipientProfileId: user.id,
        evaluationId,
      });
    }
  } catch (err) {
    console.error("Failed to send acceptance email:", err);
  }

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
