import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, getAppUrl } from "@/lib/email";
import { CompanyPaymentConfirmationEmail } from "@/lib/email/templates/company-payment-confirmation";
import { ScoreBuyConfirmationEmail } from "@/lib/email/templates/score-buy-confirmation";
import type Stripe from "stripe";

// Use service role client to bypass RLS for webhook updates
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const projectId = session.metadata?.project_id;

    if (!projectId) {
      console.error("Stripe webhook: no project_id in metadata");
      return NextResponse.json({ error: "Missing project_id" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("projects")
      .update({
        status: "paid",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    if (error) {
      console.error("Stripe webhook: failed to update project:", error.message);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    console.log(`Project ${projectId} marked as paid via Stripe webhook`);

    // Send payment confirmation email (best-effort)
    const isQuickBuy = session.metadata?.source === "quick_buy";
    const scoreId = session.metadata?.score_id;

    try {
      if (isQuickBuy && scoreId) {
        // Quick buy flow: look up email from score
        const { data: score } = await supabase
          .from("scores")
          .select("email, name, full_evaluation, buy_num_evaluations, slug")
          .eq("id", scoreId)
          .single();

        if (score) {
          const email = (score as Record<string, unknown>).email as string;
          const name = ((score as Record<string, unknown>).name as string) || "there";
          const evaluation = (score as Record<string, unknown>).full_evaluation as Record<string, unknown> | null;
          const productName = (evaluation?.product_name as string) ?? "your product";
          const numEvals = (score as Record<string, unknown>).buy_num_evaluations as number ?? 1;
          const slug = (score as Record<string, unknown>).slug as string;

          await sendEmail({
            to: email,
            subject: `Your developer evaluations for ${productName} are booked`,
            react: ScoreBuyConfirmationEmail({
              recipientName: name,
              productName,
              numEvaluations: numEvals,
              totalPrice: numEvals * 399,
              reportUrl: `${getAppUrl()}/score/${slug}`,
              signupUrl: `${getAppUrl()}/signup`,
            }),
            type: "score_buy_confirmation",
            replyTo: "tessa@builtfor.dev",
            projectId,
          });

          // Update score_leads to converted
          await supabase
            .from("score_leads")
            .update({ follow_up_status: "converted" })
            .eq("email", email);
        }
      } else {
        // Standard company flow: look up email from company
        const { data: project } = await supabase
          .from("projects")
          .select("product_name, companies(primary_contact_email, primary_contact_name)")
          .eq("id", projectId)
          .single();

        const company = project?.companies as unknown as {
          primary_contact_email: string | null;
          primary_contact_name: string | null;
        } | null;

        if (company?.primary_contact_email) {
          await sendEmail({
            to: company.primary_contact_email,
            subject: `Payment confirmed for ${project?.product_name ?? "your project"}`,
            react: CompanyPaymentConfirmationEmail({
              contactName: company.primary_contact_name || "there",
              projectName: project?.product_name ?? "your project",
              dashboardUrl: `${getAppUrl()}/company/projects/${projectId}`,
            }),
            type: "company_payment_confirmation",
            projectId,
          });
        }
      }
    } catch (err) {
      console.error("Stripe webhook: failed to send payment confirmation email:", err);
    }
  }

  return NextResponse.json({ received: true });
}
