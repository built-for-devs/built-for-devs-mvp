import type { Metadata } from "next";
import { Nav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { Problem } from "@/components/marketing/problem";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Benefits } from "@/components/marketing/benefits";
import { Pricing } from "@/components/marketing/pricing";
import { Testimonial } from "@/components/marketing/testimonial";
import { Story } from "@/components/marketing/story";
import { FAQ } from "@/components/marketing/faq";
import { BottomCTA } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Built for Devs | Find out why developers aren't adopting your product",
  description:
    "Real developers try your product and record their honest reactions. Get screen recordings and a findings report showing your biggest friction points and quickest wins.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <ProductPreview />
      <Benefits />
      <Pricing />
      <Testimonial />
      <Story />
      <FAQ />
      <BottomCTA />
      <Footer />
    </div>
  );
}
