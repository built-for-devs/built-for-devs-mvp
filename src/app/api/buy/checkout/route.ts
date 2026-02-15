import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import type { IcpCriteria } from "@/types/icp";
import { ICP_CRITERIA_KEYS } from "@/types/icp";

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
  // Common fields
  productName: string;
  productUrl: string;
  productDescription?: string;
  email: string;
  contactName: string;
  companyName: string;
  numEvaluations: number;
  // ICP flow (new)
  icpCriteria?: IcpCriteria;
  goals?: string[];
  // Profile flow (legacy)
  selectedProfiles?: SelectedProfile[];
}

// Map IcpCriteria keys to project column names
const icpColumnMap: Record<keyof IcpCriteria, string> = {
  role_types: "icp_role_types",
  seniority: "icp_seniority_levels",
  languages: "icp_languages",
  frameworks: "icp_frameworks",
  databases: "icp_databases",
  cloud_platforms: "icp_cloud_platforms",
  devops_tools: "icp_devops_tools",
  cicd_tools: "icp_cicd_tools",
  testing_frameworks: "icp_testing_frameworks",
  api_experience: "icp_api_experience",
  operating_systems: "icp_operating_systems",
  industries: "icp_industries",
  company_size: "icp_company_size_range",
  buying_influence: "icp_buying_influence",
  paid_tools: "icp_paid_tools",
  open_source_activity: "icp_open_source_activity",
};

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

  // Must have either ICP criteria or selected profiles
  const hasIcpCriteria = body.icpCriteria &&
    ICP_CRITERIA_KEYS.some((k) => {
      const values = body.icpCriteria?.[k];
      return Array.isArray(values) && values.length > 0;
    });
  const hasProfiles = body.selectedProfiles && body.selectedProfiles.length > 0;

  if (!hasIcpCriteria && !hasProfiles) {
    return NextResponse.json({ error: "Developer criteria or selected profiles are required" }, { status: 400 });
  }

  // Build ICP columns for the project
  const icpColumns: Record<string, string[] | null> = {};

  if (hasIcpCriteria && body.icpCriteria) {
    // Direct ICP criteria — map to project columns
    for (const key of ICP_CRITERIA_KEYS) {
      const values = body.icpCriteria[key];
      const column = icpColumnMap[key];
      icpColumns[column] = Array.isArray(values) && values.length > 0 ? values : null;
    }
  } else if (hasProfiles && body.selectedProfiles) {
    // Legacy profile-based flow — derive ICP from union of attributes
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

    icpColumns.icp_role_types = roleTypes.size ? [...roleTypes] : null;
    icpColumns.icp_seniority_levels = seniorityLevels.size ? [...seniorityLevels] : null;
    icpColumns.icp_languages = languages.size ? [...languages] : null;
    icpColumns.icp_frameworks = frameworks.size ? [...frameworks] : null;
    icpColumns.icp_buying_influence = buyingInfluence.size ? [...buyingInfluence] : null;
    icpColumns.icp_paid_tools = paidTools.size ? [...paidTools] : null;
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
      product_description: body.productDescription || null,
      num_evaluations: numEvals,
      price_per_evaluation: pricePerEval,
      total_price: totalPrice,
      status: "draft",
      buyer_email: body.email,
      buyer_name: body.contactName,
      goals: body.goals?.length ? body.goals : null,
      ...icpColumns,
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
