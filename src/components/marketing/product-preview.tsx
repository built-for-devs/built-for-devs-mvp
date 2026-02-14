import { DeveloperFeed } from "@/components/marketing/developer-feed";

export function ProductPreview() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-brand-dark">
          Define exactly who you need
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center leading-relaxed text-brand-gray">
          Filter by role type, seniority, languages, frameworks, and more.
          Explore our developer network and see who could evaluate your product.
        </p>
        <DeveloperFeed />
      </div>
    </section>
  );
}
