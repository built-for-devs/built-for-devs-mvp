import { Users, Video, ListChecks } from "lucide-react";

const benefits = [
  {
    icon: Users,
    title: "Feedback from developers who actually match your audience",
    description:
      "Not your coworkers. Not your friends. Developers with the right background, experience, and tools. The ones you actually need to win over.",
  },
  {
    icon: Video,
    title: "See friction you'd never find yourself",
    description:
      "Watch developers hit the exact moments where your docs confuse them, your onboarding loses them, or your product just doesn't click. Unedited. Unfiltered.",
  },
  {
    icon: ListChecks,
    title: "A clear picture of what to fix first",
    description:
      "Your findings report cuts through the noise: the patterns, the biggest friction points, and the changes that'll have the most impact on adoption. Stop guessing where to start.",
  },
];

export function Benefits() {
  return (
    <section className="bg-brand-light px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold text-brand-dark">
          What you get
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-xl bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-green/15">
                <benefit.icon className="h-6 w-6 text-brand-green" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-brand-dark">
                {benefit.title}
              </h3>
              <p className="mt-2 leading-relaxed text-brand-gray">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
