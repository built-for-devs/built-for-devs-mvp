import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getAppUrl } from "@/lib/email";
import { ScoreCompleteEmail } from "@/lib/email/templates/score-complete";

export async function POST(request: NextRequest) {
  const { to } = await request.json();

  if (!to) {
    return NextResponse.json({ error: "Missing 'to' field" }, { status: 400 });
  }

  try {
    await sendEmail({
      to,
      subject: "Test: Your Developer Adoption Score: TestProduct scored 85/120",
      react: ScoreCompleteEmail({
        recipientName: "Test User",
        productName: "TestProduct",
        finalScore: 85,
        classification: "excellent",
        verdict: "Strong developer experience with solid documentation.",
        quickWins: [
          {
            recommendation: "Add a quickstart guide",
            impact: "high",
            effort: "low",
          },
        ],
        reportUrl: `${getAppUrl()}/score/test123`,
      }),
      type: "score_complete",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
