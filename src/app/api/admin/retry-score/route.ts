import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";
import { runScorePipeline } from "@/lib/score/pipeline";

export const maxDuration = 300;

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  const authClient = await createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { scoreId } = await request.json();
  if (!scoreId) {
    return NextResponse.json({ error: "scoreId required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Reset score to pending
  const { error } = await supabase
    .from("scores")
    .update({
      status: "pending",
      error_message: null,
      crawl_data: {},
      scores: {},
      full_evaluation: {},
      final_score: null,
      classification: null,
      base_score: null,
      total_deductions: null,
      red_flag_deductions: null,
      processing_time_ms: null,
      completed_at: null,
      input_tokens: null,
      output_tokens: null,
      email_sent: false,
    })
    .eq("id", scoreId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Run pipeline directly (not via after()) so it reliably executes
  await runScorePipeline(scoreId);

  return NextResponse.json({ ok: true });
}
