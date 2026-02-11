import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Built for Devs" width={24} height={24} />
          <span className="text-sm font-semibold text-brand-dark">
            Built for Devs
          </span>
        </div>
        <div className="flex gap-6">
          <Link
            href="/score"
            className="text-sm text-brand-gray hover:text-brand-dark"
          >
            Get Your Score
          </Link>
          <Link
            href="/developers"
            className="text-sm text-brand-gray hover:text-brand-dark"
          >
            Evaluate Products
          </Link>
          <Link
            href="/directory"
            className="text-sm text-brand-gray hover:text-brand-dark"
          >
            Product Directory
          </Link>
          <Link
            href="/blog"
            className="text-sm text-brand-gray hover:text-brand-dark"
          >
            Blog
          </Link>
          <Link
            href="/login"
            className="text-sm text-brand-gray hover:text-brand-dark"
          >
            Log in
          </Link>
        </div>
        <p className="text-xs text-brand-gray">
          &copy; {new Date().getFullYear()} Built for Devs
        </p>
      </div>
    </footer>
  );
}
