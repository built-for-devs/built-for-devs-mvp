import Link from "next/link";

export function Hero() {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-brand-dark md:text-5xl lg:text-6xl">
          You&apos;re losing developers{" "}
          <span className="text-brand-green">
            before they even try your product.
          </span>
        </h1>
        <p className="mt-6 text-xl font-semibold text-brand-dark md:text-2xl">
          We show you what pushed them away.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-brand-gray md:text-xl">
          Most developers who drop off never come back, and never tell you
          why. We show you exactly where they hesitate, get confused, or quit,
          so you can remove the friction and turn drop-offs into adoption.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/score"
            className="rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-brand-dark transition-colors hover:bg-brand-green/80"
          >
            Get Started
          </Link>
          <a
            href="#how-it-works"
            className="rounded-lg border border-brand-gray/20 px-6 py-3 text-base font-medium text-brand-gray transition-colors hover:bg-brand-light"
          >
            See How It Works
          </a>
        </div>
      </div>
    </section>
  );
}
