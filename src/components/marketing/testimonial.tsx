export function Testimonial() {
  return (
    <section className="bg-brand-light px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-brand-dark">
          Hear it from our clients
        </h2>
        <blockquote className="mt-10">
          <p className="text-xl leading-relaxed text-brand-gray italic">
            &ldquo;The ROI was HUGE. What we got from Built for Devs was
            completely different: actionable, clear insights that gave us a real
            sense of where to go next. Honestly, this was critical to our
            process. We wouldn&apos;t have been able to get these results on our
            own.&rdquo;
          </p>
          <footer className="mt-6">
            <p className="font-semibold text-brand-dark">
              Founder and CEO, Deplyr
            </p>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
