import { IcpWizard } from "@/components/marketing/icp-wizard";

export function ProductPreview() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-brand-dark">
          Describe your product, we&apos;ll find the right developers
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center leading-relaxed text-brand-gray">
          Enter your product URL and our AI will suggest the ideal developer profile,
          then show you matching evaluators from our network.
        </p>
        <IcpWizard />
      </div>
    </section>
  );
}
