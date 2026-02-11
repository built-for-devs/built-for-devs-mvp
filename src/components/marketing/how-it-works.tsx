import Link from "next/link";

const steps = [
  {
    number: "1",
    title: "Define your target developer",
    description:
      "You define the exact developer profile you need feedback from: language, experience level, specialization, and what matters most to your product.",
  },
  {
    number: "2",
    title: "We recruit and match",
    description:
      "We hand-pick developers from our 6,000+ network who match your exact criteria. Right role, right experience, right tools.",
  },
  {
    number: "3",
    title: "They try your product (on camera)",
    description:
      "Developers navigate your product for the first time while screen-recording and thinking out loud. No scripts. No guidance. Just an honest first experience.",
  },
  {
    number: "4",
    title: "You get recordings + a findings report",
    description:
      "Within days, you receive the unedited recordings plus a report highlighting your biggest friction points and quickest wins.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold text-brand-dark">
          How it works
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {steps.map((step) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-lg font-bold text-brand-dark">
                {step.number}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-brand-dark">
                  {step.title}
                </h3>
                <p className="mt-2 leading-relaxed text-brand-gray">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/score"
            className="rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-brand-dark transition-colors hover:bg-brand-green/80"
          >
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}
