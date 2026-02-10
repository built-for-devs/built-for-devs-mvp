import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ScoreLoadingView } from "./score-loading-view";
import { ScoreReport } from "./score-report";
import type { ScoreEvaluation } from "@/lib/score/types";

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
    .select("full_evaluation, final_score, status")
    .eq("slug", slug)
    .single();

  if (!data || data.status !== "complete") {
    return { title: "Developer Adoption Score | Built for Devs" };
  }

  const evaluation = data.full_evaluation as ScoreEvaluation;
  return {
    title: `${evaluation.product_name} scored ${data.final_score}/120 | Developer Adoption Score`,
    description: `See how ${evaluation.product_name} performs across 12 developer experience categories.`,
  };
}

export default async function ScoreReportPage({ params }: PageProps) {
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

  if (score.status !== "complete") {
    return <ScoreLoadingView slug={slug} initialStatus={score.status} />;
  }

  const evaluation = score.full_evaluation as ScoreEvaluation;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold">Built for Devs</span>
          <span className="text-xs text-muted-foreground">
            Developer Adoption Score
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <ScoreReport evaluation={evaluation} />
      </main>
    </div>
  );
}
