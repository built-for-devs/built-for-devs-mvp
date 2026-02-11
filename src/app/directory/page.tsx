import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getDirectoryProducts } from "@/lib/directory/queries";
import { DirectoryGrid } from "./directory-grid";
import { DirectorySearch } from "./directory-search";
import { ClassificationFilter } from "./classification-filter";
import { PaginationControls } from "@/components/admin/pagination-controls";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Developer Product Directory | Built for Devs",
  description:
    "Browse developer products scored across 12 categories of developer experience. See scores, classifications, and detailed breakdowns.",
};

const PER_PAGE = 24;

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search =
    typeof params.search === "string" ? params.search : undefined;
  const classification =
    typeof params.classification === "string"
      ? params.classification
      : undefined;
  const page = parseInt(
    typeof params.page === "string" ? params.page : "1",
    10
  );

  const { data: products, count } = await getDirectoryProducts({
    search,
    classification,
    page,
    per_page: PER_PAGE,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/"><Image src="/website-logo.png" alt="Built for Devs" width={140} height={36} className="h-7 w-auto" /></Link>
          <span className="text-xs text-muted-foreground">
            Product Directory
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Developer Product Directory
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Browse how developer products score across 12 categories of
            developer experience.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/score">Get Your Score</Link>
          </Button>
        </div>

        <div className="mt-12 flex gap-4">
          <div className="flex-1">
            <Suspense>
              <DirectorySearch />
            </Suspense>
          </div>
          <Suspense>
            <ClassificationFilter />
          </Suspense>
        </div>

        <div className="mt-8">
          {products.length === 0 ? (
            <div className="rounded-md border p-12 text-center">
              <p className="text-muted-foreground">No products found.</p>
            </div>
          ) : (
            <DirectoryGrid products={products} />
          )}
        </div>

        {count > PER_PAGE && (
          <Suspense>
            <PaginationControls totalItems={count} perPage={PER_PAGE} />
          </Suspense>
        )}

        <div className="mt-16 rounded-lg border bg-muted/30 p-8 text-center">
          <h2 className="text-xl font-semibold">Get your product scored</h2>
          <p className="mt-2 text-muted-foreground">
            Free AI-powered evaluation across 12 developer experience
            categories.
          </p>
          <Button asChild className="mt-4">
            <Link href="/score">Score Your Product</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
