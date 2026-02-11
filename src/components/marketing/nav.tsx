import Link from "next/link";
import Image from "next/image";

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/">
            <Image src="/website-logo.png" alt="Built for Devs" width={1147} height={566} className="h-9 w-auto" />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <a
              href="#how-it-works"
              className="text-sm text-brand-gray hover:text-brand-dark"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-sm text-brand-gray hover:text-brand-dark"
            >
              Pricing
            </a>
            <Link
              href="/score"
              className="text-sm text-brand-gray hover:text-brand-dark"
            >
              Get Your Score
            </Link>
            <Link
              href="/directory"
              className="text-sm text-brand-gray hover:text-brand-dark"
            >
              Product Directory
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-brand-gray hover:text-brand-dark sm:block"
          >
            Log in
          </Link>
          <Link
            href="/score"
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-green/80"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
