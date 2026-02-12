import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";
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
  // Verify admin role
  const authClient = await createAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

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

  const { url, email, name, company_name, admin_note } = parsed.data;

  let domain: string;
  try {
    domain = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // No rate limiting for admin submissions

  const slug = nanoid(10);

  const { data: score, error: insertError } = await supabase
    .from("scores")
    .insert({
      slug,
      email,
      name: name || null,
      company_name: company_name || null,
      admin_note: admin_note || null,
      target_url: url,
      target_domain: domain,
      ip_address: "0.0.0.0",
      user_agent: "admin-submission",
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

  // Trigger background processing
  after(async () => {
    await runScorePipeline(score.id);
  });

  return NextResponse.json({ slug }, { status: 201 });
}
