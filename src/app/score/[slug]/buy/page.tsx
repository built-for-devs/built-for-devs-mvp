import { createClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ScoreEvaluation } from "@/lib/score/types";
import { QuickBuyForm } from "./quick-buy-form";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("scores")
    .select("full_evaluation, status")
    .eq("slug", slug)
    .single();

  if (!data || data.status !== "complete") {
    return { title: "Get Developer Feedback | Built for Devs" };
  }

  const evaluation = data.full_evaluation as ScoreEvaluation;
  return {
    title: `Get Developer Feedback for ${evaluation.product_name} | Built for Devs`,
    description: `See how real developers experience ${evaluation.product_name}. Get recorded evaluations from matched developers in our network.`,
  };
}

export default async function BuyPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: score, error } = await supabase
    .from("scores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !score) {
    notFound();
  }

  // Redirect to score page if not complete
  if ((score as Record<string, unknown>).status !== "complete") {
    redirect(`/score/${slug}`);
  }

  const evaluation = (score as Record<string, unknown>).full_evaluation as ScoreEvaluation;
  const finalScore = (score as Record<string, unknown>).final_score as number;
  const classification = (score as Record<string, unknown>).classification as string;
  const targetUrl = (score as Record<string, unknown>).target_url as string;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold">Built for Devs</span>
          <span className="text-xs text-muted-foreground">
            Developer Evaluations
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <QuickBuyForm
          slug={slug}
          productName={evaluation.product_name}
          targetUrl={targetUrl}
          finalScore={finalScore}
          classification={classification}
        />
      </main>
    </div>
  );
}
