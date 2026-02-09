import Link from "next/link";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="text-lg font-semibold">Built for Devs</span>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/company/projects"
              className="hover:text-foreground/80"
            >
              Projects
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground"
              >
                Logout
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
