import { createClient } from "@supabase/supabase-js";
import { crawlTarget } from "./crawl";
import { evaluateCrawlData } from "./evaluate";
import { sendEmail, getAppUrl } from "@/lib/email";
import { ScoreCompleteEmail } from "@/lib/email/templates/score-complete";
import type { ScoreEvaluation } from "./types";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function runScorePipeline(scoreId: string): Promise<void> {
  const supabase = getServiceClient();
  const startTime = Date.now();

  try {
    const { data: score, error: fetchError } = await supabase
      .from("scores")
      .select("id, slug, target_url, email, name")
      .eq("id", scoreId)
      .single();

    if (fetchError || !score) {
      console.error(`Score pipeline: score ${scoreId} not found`, fetchError);
      return;
    }

    // Step 1: Crawl
    await supabase
      .from("scores")
      .update({ status: "crawling" })
      .eq("id", scoreId);

    const crawlResult = await crawlTarget(score.target_url);

    const successfulPages = crawlResult.pages.filter(
      (p) => p.status === "success"
    );
    if (successfulPages.length === 0) {
      await supabase
        .from("scores")
        .update({
          status: "failed",
          error_message:
            "Could not crawl the target URL. The site may be unreachable or blocking automated access.",
          crawl_data: crawlResult,
        })
        .eq("id", scoreId);
      return;
    }

    // Step 2: Evaluate
    await supabase
      .from("scores")
      .update({ status: "evaluating", crawl_data: crawlResult })
      .eq("id", scoreId);

    const evaluation: ScoreEvaluation = await evaluateCrawlData(
      score.target_url,
      crawlResult
    );

    // Step 3: Store results
    const processingTimeMs = Date.now() - startTime;

    await supabase
      .from("scores")
      .update({
        status: "complete",
        scores: evaluation.scores,
        red_flag_deductions: evaluation.red_flags,
        base_score: evaluation.summary.base_score,
        total_deductions: evaluation.summary.total_deductions,
        final_score: evaluation.summary.final_score,
        classification: evaluation.summary.classification,
        full_evaluation: evaluation,
        processing_time_ms: processingTimeMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scoreId);

    // Step 4: Send email (best-effort)
    try {
      await sendEmail({
        to: score.email,
        subject: `Your Developer Adoption Score: ${evaluation.product_name} scored ${evaluation.summary.final_score}/120`,
        react: ScoreCompleteEmail({
          recipientName: score.name || "there",
          productName: evaluation.product_name,
          finalScore: evaluation.summary.final_score,
          classification: evaluation.summary.classification,
          verdict: evaluation.summary.one_line_verdict,
          quickWins: evaluation.quick_wins.slice(0, 3),
          reportUrl: `${getAppUrl()}/score/${score.slug}`,
        }),
        type: "score_complete",
      });
    } catch (emailErr) {
      console.error(
        `Score pipeline: failed to send email for ${scoreId}:`,
        emailErr
      );
    }
  } catch (err) {
    console.error(`Score pipeline failed for ${scoreId}:`, err);

    try {
      await supabase
        .from("scores")
        .update({
          status: "failed",
          error_message:
            err instanceof Error
              ? err.message
              : "An unexpected error occurred during evaluation.",
          processing_time_ms: Date.now() - startTime,
        })
        .eq("id", scoreId);
    } catch {
      // Last-resort: don't throw from error handler
    }
  }
}
