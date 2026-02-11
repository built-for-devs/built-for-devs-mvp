import Link from "next/link";

export function DeveloperCallout() {
  return (
    <section className="bg-brand-dark px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-white">
          Are you a developer?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Get paid to evaluate developer tools and shape how products are built
          for developers like you.
        </p>
        <Link
          href="/developers"
          className="mt-8 inline-block rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-brand-dark transition-colors hover:bg-brand-green/80"
        >
          Learn More
        </Link>
      </div>
    </section>
  );
}
