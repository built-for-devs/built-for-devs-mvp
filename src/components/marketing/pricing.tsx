import Link from "next/link";
import { Check } from "lucide-react";

const included = [
  "Feedback from developers who match your actual users",
  "See exactly where developers get stuck, in their own words",
  "Prioritized action plan, not just raw footage",
  "Results in days, not weeks",
];

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold text-brand-dark">
          Simple, transparent pricing
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center leading-relaxed text-brand-gray">
          Each evaluation is one developer trying your product and sharing their
          honest experience. No subscriptions, no commitments. Just pay for the
          evaluations you need.
        </p>

        <div className="mx-auto mt-12 max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-brand-gray">
              Per evaluation
            </p>
            <p className="mt-2 text-5xl font-bold text-brand-dark">$399</p>
            <p className="mt-1 text-sm font-mono text-brand-gray">
              1 eval === 1 dev
            </p>
          </div>

          <ul className="mt-8 space-y-3">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                <span className="text-brand-gray">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-center">
            <Link
              href="/score"
              className="inline-block rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-brand-dark transition-colors hover:bg-brand-green/80"
            >
              Get Started
            </Link>
          </div>

          <p className="mt-6 rounded-lg bg-brand-light/50 px-4 py-3 text-center text-sm leading-relaxed text-brand-gray">
            We require a minimum of 3 evaluations per project so we can identify real
            patterns, not just one person&apos;s opinion.{" "}
            <span className="font-medium text-brand-dark">
              10 evaluations is the sweet spot
            </span>{" "}
            for comprehensive, actionable insights.
          </p>
        </div>
      </div>
    </section>
  );
}
