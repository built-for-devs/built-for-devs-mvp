"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Developers", href: "/admin/developers" },
  { label: "Projects", href: "/admin/projects" },
  { label: "Evaluations", href: "/admin/evaluations" },
  { label: "Companies", href: "/admin/companies" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-muted/30">
        <div className="p-6">
          <span className="text-lg font-semibold">BFD Admin</span>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t p-3">
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
