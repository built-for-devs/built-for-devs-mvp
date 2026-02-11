import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ScoreForm } from "./score-form";
import { CATEGORY_META } from "@/lib/score/types";

export const metadata: Metadata = {
  title: "Developer Adoption Score | Built for Devs",
  description:
    "Get a free AI-generated score of how developer-ready your product is. Evaluated across 12 categories of developer experience.",
};

export default function ScorePage() {
  const categories = Object.values(CATEGORY_META);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/"><Image src="/website-logo.png" alt="Built for Devs" width={1147} height={566} className="h-9 w-auto" /></Link>
          <span className="text-xs text-muted-foreground">
            Developer Adoption Score
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            How developer-ready is your product?
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Get a free AI-powered evaluation across 12 categories of developer
            experience. See where you stand and what to improve.
          </p>
        </div>

        <div className="mt-12">
          <ScoreForm />
        </div>

        <div className="mt-16 space-y-6">
          <h2 className="text-center text-xl font-semibold">
            What we evaluate
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className="rounded-lg border p-4 text-sm"
              >
                <p className="font-medium">{cat.label}</p>
                <p className="mt-1 text-muted-foreground">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Built on a scoring framework shaped by years of hands-on developer
          experience research and 100+ real product evaluations.
        </p>
        <p className="mt-4 text-center text-sm">
          <Link
            href="/directory"
            className="text-muted-foreground hover:text-foreground"
          >
            Browse the product directory
          </Link>
        </p>
      </main>
    </div>
  );
}
