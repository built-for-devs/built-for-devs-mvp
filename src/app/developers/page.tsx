import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/marketing/nav";
import { Footer } from "@/components/marketing/footer";
import { Monitor, UserCheck, DollarSign, Clock, Zap, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Get Paid to Try Developer Tools | Built for Devs",
  description:
    "Get paid to try developer tools and share your honest opinion. Screen-record your first experience, stay fully anonymous, and earn money for each completed evaluation.",
  openGraph: {
    title: "Get Paid to Try Developer Tools | Built for Devs",
    description:
      "Get paid to try developer tools and share your honest opinion. Screen-record your first experience, stay fully anonymous, and earn money for each completed evaluation.",
    type: "website",
  },
};

const steps = [
  {
    number: "1",
    title: "Complete your profile",
    description:
      "Tell us about your skills, experience, and the tools you use. This takes about 5 minutes and helps us match you with relevant products.",
  },
  {
    number: "2",
    title: "Get matched to products",
    description:
      "When a company needs feedback from someone with your exact background, we invite you to evaluate their product.",
  },
  {
    number: "3",
    title: "Try the product and talk through it",
    description:
      "Navigate the product for the first time while screen-recording with your mic on. Think out loud as you go. No scripts, no guidance. Just your honest first experience.",
  },
  {
    number: "4",
    title: "Get paid",
    description:
      "Once your recording is approved, you get paid within 5 to 7 business days.",
  },
];

const benefits = [
  {
    icon: DollarSign,
    title: "Earn money for your expertise",
    description:
      "Get paid for each approved evaluation. Your developer experience is valuable and companies pay to hear your honest feedback.",
  },
  {
    icon: Clock,
    title: "Flexible and async",
    description:
      "Evaluations take about 45–60 minutes and fit around your schedule. No meetings, no calls. Just you and the product.",
  },
  {
    icon: Zap,
    title: "Shape how products are built",
    description:
      "Your feedback directly influences product roadmaps. Companies use your insights to fix friction and improve developer experience.",
  },
  {
    icon: Monitor,
    title: "Try new tools before everyone else",
    description:
      "Get early access to developer tools, APIs, and platforms. See what's being built for developers across the industry.",
  },
  {
    icon: UserCheck,
    title: "Matched to your skills",
    description:
      "We only invite you to evaluate products that match your technical background. No irrelevant requests.",
  },
  {
    icon: Shield,
    title: "Anonymous feedback",
    description:
      "Companies never see your name or identity. They receive your recording with an anonymous descriptor so you can be completely honest.",
  },
];

export default function ForDevelopersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-brand-dark md:text-5xl lg:text-6xl">
            Get paid to try{" "}
            <span className="text-brand-green">developer tools</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-gray md:text-xl">
            Companies need honest feedback from developers like you. Try their
            products, narrate your experience as you go, and get paid for every
            evaluation you complete.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/developers/join"
              className="rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-[#171717] transition-colors hover:bg-brand-green/80"
            >
              Get Paid to Build
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

      {/* How It Works */}
      <section id="how-it-works" className="bg-brand-light px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-brand-dark">
            How it works
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-lg font-bold text-[#171717]">
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
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold text-brand-dark">
            Why developers join
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="rounded-xl border p-6">
                <benefit.icon className="h-8 w-8 text-brand-green" />
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

      {/* What to Expect */}
      <section className="bg-brand-light px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-brand-dark">
            What to expect
          </h2>
          <div className="mt-12 space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-brand-dark">
                How long does an evaluation take?
              </h3>
              <p className="mt-2 leading-relaxed text-brand-gray">
                Most evaluations take 45–60 minutes. You&apos;ll navigate the
                product for the first time with a screen recording and your mic
                on, thinking out loud as you go. No camera, just your screen
                and voice.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-brand-dark">
                What products will I evaluate?
              </h3>
              <p className="mt-2 leading-relaxed text-brand-gray">
                Developer tools, APIs, SDKs, CLIs, dashboards, and platforms.
                We only match you with products relevant to your technical
                background and experience.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-brand-dark">
                How do I get paid?
              </h3>
              <p className="mt-2 leading-relaxed text-brand-gray">
                After your evaluation is reviewed and approved, payment is sent
                via PayPal so we can pay developers worldwide. You set up your
                PayPal email during profile creation.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-brand-dark">
                How much do I get paid?
              </h3>
              <p className="mt-2 leading-relaxed text-brand-gray">
                You earn $129 USD per approved evaluation.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-brand-dark">
                How often will I get invitations?
              </h3>
              <p className="mt-2 leading-relaxed text-brand-gray">
                It depends on your profile and the products companies are
                evaluating. Some developers get invitations weekly, others
                monthly. The more complete your profile, the better your
                matches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-primary px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">
            Your developer experience is valuable.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/70">
            Join our network and get paid to share honest feedback on developer
            tools.
          </p>
          <Link
            href="/developers/join"
            className="mt-8 inline-block rounded-lg bg-brand-green px-6 py-3 text-base font-medium text-[#171717] transition-colors hover:bg-brand-green/80"
          >
            Get Paid to Build
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
