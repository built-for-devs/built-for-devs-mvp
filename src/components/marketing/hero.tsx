import Link from "next/link";

export function Hero() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-brand-dark md:text-5xl lg:text-6xl">
          You built it for developers.{" "}
          <span className="text-brand-green">
            Find out why they&apos;re not using it.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-gray md:text-xl">
          Developers from our network try your product and record their honest
          reactions. You get screen recordings and a findings report showing your
          biggest friction points and quickest wins.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/score"
            className="rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-brand-dark transition-colors hover:bg-brand-green/80"
          >
            Get Your Score
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
