import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface SelectedProfile {
  jobTitle: string | null;
  roleTypes: string[];
  seniority: string | null;
  languages: string[];
  frameworks: string[];
  buyingInfluence: string | null;
  paidTools: string[];
  country: string | null;
}

interface HomepageBuyRequest {
  selectedProfiles: SelectedProfile[];
  productName: string;
  productUrl: string;
  email: string;
  contactName: string;
  companyName: string;
  numEvaluations: number;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HomepageBuyRequest;

  // Validate required fields
  if (!body.productName?.trim()) {
    return NextResponse.json({ error: "Product name is required" }, { status: 400 });
  }
  if (!body.productUrl?.trim()) {
    return NextResponse.json({ error: "Product URL is required" }, { status: 400 });
  }
  if (!body.email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!body.contactName?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }
  if (!body.numEvaluations || body.numEvaluations < 3 || body.numEvaluations > 20) {
    return NextResponse.json({ error: "Number of evaluations must be between 3 and 20" }, { status: 400 });
  }
  if (!body.selectedProfiles?.length) {
    return NextResponse.json({ error: "At least one developer must be selected" }, { status: 400 });
  }

  // Derive ICP from selected profiles (union of attributes)
  const roleTypes = new Set<string>();
  const seniorityLevels = new Set<string>();
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const buyingInfluence = new Set<string>();
  const paidTools = new Set<string>();

  for (const profile of body.selectedProfiles) {
    profile.roleTypes.forEach((r) => roleTypes.add(r));
    profile.languages.forEach((l) => languages.add(l));
    profile.frameworks.forEach((f) => frameworks.add(f));
    profile.paidTools.forEach((t) => paidTools.add(t));
    if (profile.seniority) seniorityLevels.add(profile.seniority);
    if (profile.buyingInfluence) buyingInfluence.add(profile.buyingInfluence);
  }

  const supabase = createServiceClient();

  const numEvals = body.numEvaluations;
  const pricePerEval = 399;
  const totalPrice = numEvals * pricePerEval;

  // Extract domain from product URL
  let domain: string;
  try {
    domain = new URL(body.productUrl).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid product URL" }, { status: 400 });
  }

  // Find or create company
  let companyId: string | null = null;
  try {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", body.companyName)
      .maybeSingle();

    if (existing) {
      companyId = existing.id;
    } else {
      const { data: created } = await supabase
        .from("companies")
        .insert({ name: body.companyName, website: `https://${domain}` })
        .select("id")
        .single();
      companyId = created?.id ?? null;
    }
  } catch (err) {
    console.error("Failed to find/create company:", err);
  }

  if (!companyId) {
    return NextResponse.json({ error: "Failed to create company record" }, { status: 500 });
  }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      company_id: companyId,
      product_name: body.productName,
      product_url: body.productUrl,
      num_evaluations: numEvals,
      price_per_evaluation: pricePerEval,
      total_price: totalPrice,
      status: "draft",
      buyer_email: body.email,
      buyer_name: body.contactName,
      // ICP fields derived from selected profiles
      icp_role_types: roleTypes.size ? [...roleTypes] : null,
      icp_seniority_levels: seniorityLevels.size ? [...seniorityLevels] : null,
      icp_languages: languages.size ? [...languages] : null,
      icp_frameworks: frameworks.size ? [...frameworks] : null,
      icp_buying_influence: buyingInfluence.size ? [...buyingInfluence] : null,
      icp_paid_tools: paidTools.size ? [...paidTools] : null,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    console.error("Failed to create project:", projectError);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  // Create Stripe checkout session
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: body.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Developer Evaluations: ${body.productName}`,
            description: `${numEvals} developer evaluation${numEvals > 1 ? "s" : ""} at $399 each`,
          },
          unit_amount: 39900,
        },
        quantity: numEvals,
      },
    ],
    metadata: {
      project_id: project.id,
      source: "homepage_buy",
    },
    success_url: `${baseUrl}/buy/success?project_id=${project.id}`,
    cancel_url: `${baseUrl}/buy`,
  });

  return NextResponse.json({ url: session.url });
}
