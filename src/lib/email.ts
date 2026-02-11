import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import type { ReactElement } from "react";

const FROM_ADDRESS = "Built for Devs <hello@email.builtfor.dev>";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
  type: string;
  replyTo?: string;
  recipientProfileId?: string;
  evaluationId?: string;
  projectId?: string;
}

export async function sendEmail({
  to,
  subject,
  react,
  type,
  replyTo,
  recipientProfileId,
  evaluationId,
  projectId,
}: SendEmailOptions): Promise<void> {
  try {
    const { error } = await getResend().emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      react,
      ...(replyTo && { replyTo }),
    });

    const supabase = getServiceClient();
    await supabase.from("email_notifications").insert({
      recipient_email: to,
      recipient_profile_id: recipientProfileId || null,
      type,
      related_evaluation_id: evaluationId || null,
      related_project_id: projectId || null,
      sent_at: new Date().toISOString(),
      status: error ? "failed" : "sent",
    });

    if (error) {
      console.error(`Email send failed (${type} to ${to}):`, error);
    }
  } catch (err) {
    console.error(`Email send error (${type} to ${to}):`, err);

    // Best-effort log
    try {
      const supabase = getServiceClient();
      await supabase.from("email_notifications").insert({
        recipient_email: to,
        recipient_profile_id: recipientProfileId || null,
        type,
        related_evaluation_id: evaluationId || null,
        related_project_id: projectId || null,
        sent_at: new Date().toISOString(),
        status: "failed",
      });
    } catch {
      // Silently fail — don't break the parent action
    }
  }
}

export { getAppUrl };
