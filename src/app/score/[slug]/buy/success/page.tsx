import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { ScoreEvaluation } from "@/lib/score/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail } from "lucide-react";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "Payment Confirmed | Built for Devs",
};

export default async function BuySuccessPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: score } = await supabase
    .from("scores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!score) {
    notFound();
  }

  const evaluation = (score as Record<string, unknown>).full_evaluation as ScoreEvaluation | null;
  const productName = evaluation?.product_name ?? (score as Record<string, unknown>).target_domain as string;
  const email = (score as Record<string, unknown>).email as string;
  const numEvals = (score as Record<string, unknown>).buy_num_evaluations as number | null;

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

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="space-y-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              Your developer evaluations are booked!
            </h1>
            <p className="text-muted-foreground">
              {numEvals
                ? `${numEvals} developer evaluation${numEvals > 1 ? "s" : ""} for ${productName}`
                : `Developer evaluations for ${productName}`}
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 p-6 text-left">
              <h2 className="font-semibold">What happens next</h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </span>
                  <span>
                    We&apos;ll match developers from our network who fit your
                    target profile within 48 hours.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </span>
                  <span>
                    Each developer will try your product cold and record their
                    screen + honest reactions.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    3
                  </span>
                  <span>
                    You&apos;ll receive the recordings plus a findings report
                    highlighting friction points and quick wins.
                  </span>
                </li>
              </ol>

              <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  Updates will be sent to <strong>{email}</strong>
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Create a free account to track your evaluations in real-time.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href="/signup">Create Account</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/score/${slug}`}>View Your Score Report</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
