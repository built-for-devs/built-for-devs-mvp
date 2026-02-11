"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What kind of developers do the evaluations?",
    answer:
      "Our network is 6,000+ developers, mostly US-based, spanning frontend, backend, full-stack, mobile, DevOps, and more. We match them to your product based on language, experience level, specialization, and other criteria you define.",
  },
  {
    question: "How fast do I get results?",
    answer:
      "You get each screen recording as soon as a developer finishes, so you can start watching right away. Once all evaluations are complete, your findings report follows within a day or two.",
  },
  {
    question: "What does the report actually look like?",
    answer:
      "A prioritized breakdown of the biggest friction points developers hit, patterns across evaluations, and quick-win recommendations. It's a clear action plan, not a data dump.",
  },
  {
    question: "How many evaluations do I need?",
    answer:
      "You choose how many you want. Even one evaluation surfaces friction you'd never catch on your own. Most clients see clear patterns emerge around 4-5 developers.",
  },
  {
    question: "Is this usability testing?",
    answer:
      "It's closer to a product evaluation than traditional usability testing. Developers aren't given tasks to complete. They explore your product the way they would in real life. That's how you find the friction that matters.",
  },
  {
    question: "What if my product isn't ready yet?",
    answer:
      "If a developer can sign up and try it, it's ready enough. Early feedback saves you from building in the wrong direction.",
  },
];

export function FAQ() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold text-brand-dark">
          Questions
        </h2>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium text-brand-dark">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-brand-gray">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
