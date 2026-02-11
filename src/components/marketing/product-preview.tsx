import Image from "next/image";

export function ProductPreview() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold text-brand-dark">
          Define exactly who you need
        </h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-brand-gray">
          Filter by role type, seniority, languages, frameworks, and more.
          We&apos;ll match you with developers from our network who fit your
          criteria.
        </p>
        <div className="mt-10 overflow-hidden rounded-xl border shadow-lg">
          <Image
            src="/icp-criteria.png"
            alt="Define your target developer — filter by role types, seniority levels, languages, experience, and more"
            width={1588}
            height={1040}
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}
