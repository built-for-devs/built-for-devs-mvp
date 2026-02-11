import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface CheckoutRequest {
  icp: {
    role_types?: string[];
    seniority_levels?: string[];
    languages?: string[];
    min_experience?: number;
    frameworks?: string[];
    databases?: string[];
    cloud_platforms?: string[];
    industries?: string[];
    devops_tools?: string[];
    cicd_tools?: string[];
    testing_frameworks?: string[];
    api_experience?: string[];
    operating_systems?: string[];
    company_size?: string[];
    buying_influence?: string[];
    paid_tools?: string[];
    open_source_activity?: string[];
  };
  num_evaluations: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = (await request.json()) as CheckoutRequest;

  // Validate
  if (!body.num_evaluations || body.num_evaluations < 1) {
    return NextResponse.json(
      { error: "At least 1 evaluation is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Fetch score
  const { data: score } = await (supabase as ReturnType<typeof createServiceClient> & { from: (t: string) => ReturnType<typeof supabase.from> })
    .from("scores")
    .select("*")
    .eq("slug", slug)
    .eq("status", "complete")
    .single();

  if (!score) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  // Check for existing project from this score
  const existingProjectId = (score as Record<string, unknown>).buy_project_id as string | null;
  if (existingProjectId) {
    // Reuse existing project — check if it's still in draft
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id, status")
      .eq("id", existingProjectId)
      .single();

    if (existingProject && (existingProject as Record<string, unknown>).status === "paid") {
      return NextResponse.json(
        { error: "This score already has a paid project" },
        { status: 400 }
      );
    }
  }

  const icp = body.icp;
  const numEvals = body.num_evaluations;
  const pricePerEval = 399;
  const totalPrice = numEvals * pricePerEval;

  // Extract product info from score evaluation
  const evaluation = (score as Record<string, unknown>).full_evaluation as Record<string, unknown> | null;
  const productName = (evaluation?.product_name as string) ?? (score as Record<string, unknown>).target_domain as string;
  const targetUrl = (score as Record<string, unknown>).target_url as string;
  const email = (score as Record<string, unknown>).email as string;
  const companyName = (score as Record<string, unknown>).company_name as string | null;
  const domain = (score as Record<string, unknown>).target_domain as string;

  // Save ICP to score row
  await supabase
    .from("scores")
    .update({
      buy_icp: icp,
      buy_num_evaluations: numEvals,
    })
    .eq("id", (score as Record<string, unknown>).id);

  // Find or create company (same pattern as score API route)
  let companyId: string | null = (score as Record<string, unknown>).company_id as string | null;
  if (!companyId && companyName) {
    try {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .ilike("name", companyName)
        .maybeSingle();

      if (existing) {
        companyId = existing.id;
      } else {
        const { data: created } = await supabase
          .from("companies")
          .insert({ name: companyName, website: `https://${domain}` })
          .select("id")
          .single();
        companyId = created?.id ?? null;
      }
    } catch (err) {
      console.error("Failed to find/create company:", err);
    }
  }

  // If still no company, create one from domain
  if (!companyId) {
    try {
      const { data: created } = await supabase
        .from("companies")
        .insert({ name: companyName || domain, website: `https://${domain}` })
        .select("id")
        .single();
      companyId = created?.id ?? null;
    } catch (err) {
      console.error("Failed to create company from domain:", err);
    }
  }

  // Create or reuse project
  let projectId = existingProjectId;

  if (!projectId) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        company_id: companyId,
        product_name: productName,
        product_url: targetUrl,
        num_evaluations: numEvals,
        price_per_evaluation: pricePerEval,
        total_price: totalPrice,
        status: "draft",
        // ICP fields
        icp_role_types: icp.role_types?.length ? icp.role_types : null,
        icp_seniority_levels: icp.seniority_levels?.length ? icp.seniority_levels : null,
        icp_languages: icp.languages?.length ? icp.languages : null,
        icp_min_experience: icp.min_experience ?? null,
        icp_frameworks: icp.frameworks?.length ? icp.frameworks : null,
        icp_databases: icp.databases?.length ? icp.databases : null,
        icp_cloud_platforms: icp.cloud_platforms?.length ? icp.cloud_platforms : null,
        icp_industries: icp.industries?.length ? icp.industries : null,
        icp_devops_tools: icp.devops_tools?.length ? icp.devops_tools : null,
        icp_cicd_tools: icp.cicd_tools?.length ? icp.cicd_tools : null,
        icp_testing_frameworks: icp.testing_frameworks?.length ? icp.testing_frameworks : null,
        icp_api_experience: icp.api_experience?.length ? icp.api_experience : null,
        icp_operating_systems: icp.operating_systems?.length ? icp.operating_systems : null,
        icp_company_size_range: icp.company_size?.length ? icp.company_size : null,
        icp_buying_influence: icp.buying_influence?.length ? icp.buying_influence : null,
        icp_paid_tools: icp.paid_tools?.length ? icp.paid_tools : null,
        icp_open_source_activity: icp.open_source_activity?.length ? icp.open_source_activity : null,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      console.error("Failed to create project:", projectError);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    projectId = project.id;

    // Link project to score
    await supabase
      .from("scores")
      .update({ buy_project_id: projectId })
      .eq("id", (score as Record<string, unknown>).id);
  } else {
    // Update existing project with new ICP/count
    await supabase
      .from("projects")
      .update({
        num_evaluations: numEvals,
        total_price: totalPrice,
        icp_role_types: icp.role_types?.length ? icp.role_types : null,
        icp_seniority_levels: icp.seniority_levels?.length ? icp.seniority_levels : null,
        icp_languages: icp.languages?.length ? icp.languages : null,
        icp_min_experience: icp.min_experience ?? null,
        icp_frameworks: icp.frameworks?.length ? icp.frameworks : null,
        icp_databases: icp.databases?.length ? icp.databases : null,
        icp_cloud_platforms: icp.cloud_platforms?.length ? icp.cloud_platforms : null,
        icp_industries: icp.industries?.length ? icp.industries : null,
        icp_devops_tools: icp.devops_tools?.length ? icp.devops_tools : null,
        icp_cicd_tools: icp.cicd_tools?.length ? icp.cicd_tools : null,
        icp_testing_frameworks: icp.testing_frameworks?.length ? icp.testing_frameworks : null,
        icp_api_experience: icp.api_experience?.length ? icp.api_experience : null,
        icp_operating_systems: icp.operating_systems?.length ? icp.operating_systems : null,
        icp_company_size_range: icp.company_size?.length ? icp.company_size : null,
        icp_buying_influence: icp.buying_influence?.length ? icp.buying_influence : null,
        icp_paid_tools: icp.paid_tools?.length ? icp.paid_tools : null,
        icp_open_source_activity: icp.open_source_activity?.length ? icp.open_source_activity : null,
      })
      .eq("id", projectId);
  }

  // Create Stripe checkout session
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Developer Evaluations: ${productName}`,
            description: `${numEvals} developer evaluation${numEvals > 1 ? "s" : ""} at $399 each`,
          },
          unit_amount: 39900,
        },
        quantity: numEvals,
      },
    ],
    metadata: {
      project_id: projectId!,
      score_id: (score as Record<string, unknown>).id as string,
      source: "quick_buy",
    },
    success_url: `${baseUrl}/score/${slug}/buy/success`,
    cancel_url: `${baseUrl}/score/${slug}/buy`,
  });

  return NextResponse.json({ url: session.url });
}
