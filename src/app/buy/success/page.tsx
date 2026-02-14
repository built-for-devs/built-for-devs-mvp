import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail } from "lucide-react";
import { ClearLocalStorage } from "./clear-storage";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface PageProps {
  searchParams: Promise<{ project_id?: string }>;
}

export const metadata: Metadata = {
  title: "Payment Confirmed | Built for Devs",
};

export default async function BuySuccessPage({ searchParams }: PageProps) {
  const { project_id } = await searchParams;

  if (!project_id) {
    notFound();
  }

  const supabase = createServiceClient();
  const { data: project } = await supabase
    .from("projects")
    .select("product_name, num_evaluations, total_price, buyer_email")
    .eq("id", project_id)
    .single();

  if (!project) {
    notFound();
  }

  const productName = project.product_name ?? "your product";
  const numEvals = project.num_evaluations as number | null;
  const totalPrice = project.total_price as number | null;
  const email = project.buyer_email as string | null;

  return (
    <div className="min-h-screen bg-background">
      <ClearLocalStorage />
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link href="/">
            <Image
              src="/website-logo.png"
              alt="Built for Devs"
              width={1147}
              height={566}
              className="h-9 w-auto dark:hidden"
            />
            <Image
              src="/website-logo-dark.png"
              alt="Built for Devs"
              width={1147}
              height={566}
              className="hidden h-9 w-auto dark:block"
            />
          </Link>
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
              {numEvals && totalPrice
                ? `${numEvals} developer evaluation${numEvals > 1 ? "s" : ""} for ${productName} — $${totalPrice.toLocaleString()}`
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

              {email && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    Updates will be sent to <strong>{email}</strong>
                  </span>
                </div>
              )}
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
                <Link href="/">Back to Homepage</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
