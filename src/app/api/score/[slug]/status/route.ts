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
  if (data.status === "complete" && !data.email_sent && data.full_evaluation) {
    // Mark as sent first to prevent double-sends from concurrent polls
    await supabase
      .from("scores")
      .update({ email_sent: true })
      .eq("slug", slug)
      .eq("email_sent", false);

    const evaluation = data.full_evaluation as ScoreEvaluation;
    try {
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
        }),
        type: "score_complete",
      });
    } catch (emailErr) {
      console.error(`Score email failed for ${slug}:`, emailErr);
    }
  }

  return NextResponse.json({
    status: data.status,
    error_message: data.error_message,
  });
}
