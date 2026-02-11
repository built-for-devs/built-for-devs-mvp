import Link from "next/link";

export function BottomCTA() {
  return (
    <section className="bg-brand-dark px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-white">
          Stop guessing. See what developers really think.
        </h2>
        <Link
          href="/score"
          className="mt-8 inline-block rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-brand-dark transition-colors hover:bg-brand-green/80"
        >
          Get Your Score
        </Link>
      </div>
    </section>
  );
}
