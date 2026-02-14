import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFolkPeople, toContactView } from "@/lib/folk";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const groupId = searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json(
      { error: "groupId is required" },
      { status: 400 }
    );
  }

  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "10", 10) || 10,
    100
  );
  const cursor = searchParams.get("cursor") ?? undefined;
  const emailOnly = searchParams.get("emailOnly") !== "false"; // default true
  const titleFilter = searchParams.get("titleFilter") ?? undefined;

  const titleKeywords = titleFilter
    ? titleFilter.toLowerCase().split(",").map((k) => k.trim()).filter(Boolean)
    : null;

  const needsServerFilter = emailOnly || titleKeywords;

  try {
    // Load existing BFD developer emails to exclude already-imported contacts
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("email")
      .neq("role", "admin");
    const bfdEmails = new Set(
      (existingProfiles ?? []).map((p) => p.email.toLowerCase())
    );

    if (!needsServerFilter && bfdEmails.size === 0) {
      // No filters and no existing devs — simple pass-through
      const { items, nextCursor } = await getFolkPeople(groupId, limit, cursor);
      const contacts = items.map((p) => toContactView(p, groupId));
      return NextResponse.json({ contacts, nextCursor });
    }

    // With filters: fetch pages from Folk and filter server-side
    const matched = [];
    let folkCursor = cursor;
    const MAX_PAGES = 20;

    for (let page = 0; page < MAX_PAGES; page++) {
      const { items, nextCursor } = await getFolkPeople(groupId, 100, folkCursor);

      for (const person of items) {
        // Skip contacts already in BFD
        const email = person.emails?.[0];
        if (email && bfdEmails.has(email.toLowerCase())) continue;

        // Skip contacts without email
        if (emailOnly && !email) continue;

        // Title/role filter — search job title, company name, and group custom fields
        if (titleKeywords) {
          const searchParts = [
            person.jobTitle,
            person.companies?.[0]?.name,
          ];
          // Also search group custom field values (e.g. "Role type")
          const groupFields = person.customFieldValues?.[groupId];
          if (groupFields) {
            for (const val of Object.values(groupFields)) {
              if (typeof val === "string") searchParts.push(val);
              else if (Array.isArray(val)) searchParts.push(...val.map(String));
            }
          }
          const searchable = searchParts.filter(Boolean).join(" ").toLowerCase();
          if (!titleKeywords.some((kw) => searchable.includes(kw))) continue;
        }

        matched.push(toContactView(person, groupId));
        if (matched.length >= limit) break;
      }

      if (matched.length >= limit || !nextCursor) {
        return NextResponse.json({
          contacts: matched.slice(0, limit),
          nextCursor: matched.length >= limit ? nextCursor ?? folkCursor : null,
        });
      }

      folkCursor = nextCursor;
    }

    return NextResponse.json({ contacts: matched, nextCursor: null });
  } catch (err) {
    console.error("Folk people error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Folk contacts" },
      { status: 500 }
    );
  }
}
