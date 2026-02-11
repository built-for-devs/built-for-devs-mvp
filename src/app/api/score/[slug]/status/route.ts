import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, getAppUrl } from "@/lib/email";
import { ScoreCompleteEmail } from "@/lib/email/templates/score-complete";
import type { ScoreEvaluation } from "@/lib/score/types";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("scores")
    .select("status, error_message, email, name, slug, email_sent, full_evaluation")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  // Send email on first poll after completion
  console.log(`[score-status] ${slug}: status=${data.status}, email_sent=${data.email_sent}, has_evaluation=${!!data.full_evaluation}`);

  if (data.status === "complete" && !data.email_sent && data.full_evaluation) {
    console.log(`[score-status] ${slug}: Sending completion email to ${data.email}`);

    // Mark as sent first to prevent double-sends from concurrent polls
    const { error: flagError } = await supabase
      .from("scores")
      .update({ email_sent: true })
      .eq("slug", slug)
      .eq("email_sent", false);

    if (flagError) {
      console.error(`[score-status] ${slug}: Failed to set email_sent flag:`, flagError);
    }

    const evaluation = data.full_evaluation as ScoreEvaluation;
    try {
      console.log(`[score-status] ${slug}: Calling sendEmail with product=${evaluation.product_name}, score=${evaluation.summary?.final_score}`);
      await sendEmail({
        to: data.email,
        subject: `Your Developer Adoption Score: ${evaluation.product_name} scored ${evaluation.summary.final_score}/120`,
        react: ScoreCompleteEmail({
          recipientName: data.name || "there",
          productName: evaluation.product_name,
          finalScore: evaluation.summary.final_score,
          classification: evaluation.summary.classification,
          verdict: evaluation.summary.one_line_verdict,
          quickWins: evaluation.quick_wins.slice(0, 3),
          reportUrl: `${getAppUrl()}/score/${data.slug}`,
          baseUrl: getAppUrl(),
        }),
        type: "score_complete",
        replyTo: "tessa@builtfor.dev",
      });
      console.log(`[score-status] ${slug}: sendEmail completed successfully`);
    } catch (emailErr) {
      console.error(`[score-status] ${slug}: sendEmail threw:`, emailErr);
    }
  }

  return NextResponse.json({
    status: data.status,
    error_message: data.error_message,
  });
}
