"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function CompanyNav() {
  const pathname = usePathname();

  const links = [
    { href: "/company/projects", label: "Projects" },
  ];

  return (
    <nav className="flex items-center gap-6 text-sm">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            pathname.startsWith(link.href)
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }
        >
          {link.label}
        </Link>
      ))}
      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className="text-muted-foreground hover:text-foreground"
        >
          Logout
        </button>
      </form>
    </nav>
  );
}
