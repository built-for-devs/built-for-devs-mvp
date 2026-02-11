import Link from "next/link";

export function DeveloperCallout() {
  return (
    <section className="bg-brand-dark px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-green">
          For Developers
        </p>
        <h2 className="mt-3 text-3xl font-bold text-white">
          Get paid to try developer tools
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Screen-record yourself trying a product for the first time, say what
          you really think, and get paid. No meetings. No scripts. Fully anonymous.
        </p>
        <Link
          href="/developers"
          className="mt-8 inline-block rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-brand-dark transition-colors hover:bg-brand-green/80"
        >
          Start Earning
        </Link>
      </div>
    </section>
  );
}
