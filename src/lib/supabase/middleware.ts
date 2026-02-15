import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and getClaims().
  // getClaims() validates the JWT locally (no DB round-trip) and refreshes if expired.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicPrefixes = ["/login", "/signup", "/forgot-password", "/score", "/api/score", "/api/developers/feed", "/api/icp", "/directory", "/blog", "/developers", "/buy", "/api/buy"];
  const isPublicRoute =
    pathname === "/" ||
    publicPrefixes.some((route) => pathname.startsWith(route));

  // Unauthenticated user on a protected route → redirect to login
  if (!claims && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user on a public route → redirect to their portal
  // (except /score which is accessible to everyone)
  if (claims && isPublicRoute && !pathname.startsWith("/score") && !pathname.startsWith("/api/score") && !pathname.startsWith("/directory") && !pathname.startsWith("/blog") && !pathname.startsWith("/developers") && !pathname.startsWith("/buy") && !pathname.startsWith("/api/buy")) {
    const role = (claims as Record<string, unknown>).user_metadata as Record<string, unknown> | undefined;
    const userRole = role?.role as string | undefined;
    const url = request.nextUrl.clone();
    url.pathname = getPortalPath(userRole);
    return NextResponse.redirect(url);
  }

  // Authenticated user — enforce role-based access
  if (claims) {
    const role = (claims as Record<string, unknown>).user_metadata as Record<string, unknown> | undefined;
    const userRole = role?.role as string | undefined;

    if (pathname.startsWith("/dev") && userRole !== "developer") {
      const url = request.nextUrl.clone();
      url.pathname = getPortalPath(userRole);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/company") && userRole !== "company") {
      const url = request.nextUrl.clone();
      url.pathname = getPortalPath(userRole);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/admin") && userRole !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = getPortalPath(userRole);
      return NextResponse.redirect(url);
    }

    // Root path → redirect to portal
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = getPortalPath(userRole);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

function getPortalPath(role: string | undefined): string {
  switch (role) {
    case "developer":
      return "/dev/profile";
    case "company":
      return "/company/projects";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/login";
  }
}
