import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { scoreSubmitSchema } from "@/lib/score/validation";
import { runScorePipeline } from "@/lib/score/pipeline";

export const maxDuration = 300;

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = scoreSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const { url, email, name, company_name } = parsed.data;

  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Get client IP (x-real-ip is Vercel's reliable client IP header)
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0";

  const supabase = createServiceClient();

  // Rate limit: 3 scores per IP per 24 hours
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const { count, error: rlError } = await supabase
    .from("score_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", twentyFourHoursAgo);

  if (!rlError && count !== null && count >= 3) {
    return NextResponse.json(
      {
        error:
          "You've hit the daily limit (3 scores per day). Come back tomorrow or talk to us about a full evaluation.",
      },
      { status: 429 }
    );
  }

  // Generate slug and create score
  const slug = nanoid(10);

  const { data: score, error: insertError } = await supabase
    .from("scores")
    .insert({
      slug,
      email,
      name: name || null,
      company_name: company_name || null,
      target_url: url,
      target_domain: domain,
      ip_address: ip,
      user_agent: request.headers.get("user-agent") || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !score) {
    console.error("Failed to create score:", insertError);
    return NextResponse.json(
      { error: "Failed to create score. Please try again." },
      { status: 500 }
    );
  }

  // Rate limit record (best-effort)
  await supabase.from("score_rate_limits").insert({
    ip_address: ip,
    score_id: score.id,
  });

  // Auto-create or link company (best-effort)
  if (company_name) {
    try {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", company_name)
        .maybeSingle();

      let companyId: string;
      if (existing) {
        companyId = existing.id;
      } else {
        const { data: created } = await supabase
          .from("companies")
          .insert({
            name: company_name,
            website: `https://${domain}`,
          })
          .select("id")
          .single();
        companyId = created?.id;
      }

      if (companyId) {
        await supabase
          .from("scores")
          .update({ company_id: companyId })
          .eq("id", score.id);
      }
    } catch (err) {
      console.error("Failed to link company:", err);
    }
  }

  // Upsert lead (best-effort)
  try {
    const { data: existingLead } = await supabase
      .from("score_leads")
      .select("id, score_count, domains_scored")
      .eq("email", email)
      .maybeSingle();

    if (existingLead) {
      const domains = existingLead.domains_scored || [];
      if (!domains.includes(domain)) {
        domains.push(domain);
      }
      await supabase
        .from("score_leads")
        .update({
          name: name || undefined,
          company_name: company_name || undefined,
          score_count: (existingLead.score_count || 0) + 1,
          domains_scored: domains,
          latest_score_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id);
    } else {
      await supabase.from("score_leads").insert({
        email,
        name: name || null,
        company_name: company_name || null,
        domains_scored: [domain],
      });
    }
  } catch (err) {
    console.error("Failed to upsert lead:", err);
  }

  // Trigger background processing
  after(async () => {
    await runScorePipeline(score.id);
  });

  return NextResponse.json({ slug }, { status: 201 });
}
