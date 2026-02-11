import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const { to } = await request.json();

  if (!to) {
    return NextResponse.json({ error: "Missing 'to' field" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set", hasKey: false },
      { status: 500 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: "Built for Devs <hello@email.builtfor.dev>",
      to,
      subject: "Test email from Built for Devs",
      text: "If you received this, Resend is working correctly.",
    });

    if (error) {
      return NextResponse.json({ error, resendError: true }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error", caught: true },
      { status: 500 }
    );
  }
}
