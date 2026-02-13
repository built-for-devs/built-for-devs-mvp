import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Get Developer Evaluations | Built for Devs",
  description:
    "Purchase developer evaluations for your product. Real developers try your product and record their honest reactions.",
};

export default function BuyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link href="/">
            <Image
              src="/website-logo.png"
              alt="Built for Devs"
              width={1147}
              height={566}
              className="h-9 w-auto dark:hidden"
            />
            <Image
              src="/website-logo-dark.png"
              alt="Built for Devs"
              width={1147}
              height={566}
              className="hidden h-9 w-auto dark:block"
            />
          </Link>
          <span className="text-xs text-muted-foreground">
            Developer Evaluations
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <CheckoutForm />
      </main>
    </div>
  );
}
