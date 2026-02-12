import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FOLK_BASE = "https://api.folk.app/v1";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const key = process.env.FOLK_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "FOLK_API_KEY not set" }, { status: 500 });
  }

  const { personIds, groupId, groupName } = (await request.json()) as {
    personIds: string[];
    groupId?: string;
    groupName?: string;
  };

  if (!personIds?.length) {
    return NextResponse.json({ error: "personIds required" }, { status: 400 });
  }

  // Resolve or create the target group
  let targetGroupId = groupId;

  if (!targetGroupId && groupName) {
    // Check if group already exists
    const groupsRes = await fetch(`${FOLK_BASE}/groups?limit=100`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (groupsRes.ok) {
      const groupsData = await groupsRes.json();
      const existing = groupsData.data?.items?.find(
        (g: { id: string; name: string }) =>
          g.name.toLowerCase() === groupName.toLowerCase()
      );
      if (existing) {
        targetGroupId = existing.id;
      }
    }

    // If still not found, we can't create groups via API — return error
    if (!targetGroupId) {
      return NextResponse.json(
        {
          error: `Group "${groupName}" not found in Folk. Please create it in Folk first, then try again.`,
        },
        { status: 404 }
      );
    }
  }

  if (!targetGroupId) {
    return NextResponse.json(
      { error: "groupId or groupName required" },
      { status: 400 }
    );
  }

  // Add each person to the group (must merge with existing groups)
  let added = 0;
  const errors: string[] = [];

  for (const personId of personIds) {
    try {
      // Fetch current person to get their existing groups
      const getRes = await fetch(`${FOLK_BASE}/people/${personId}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!getRes.ok) {
        errors.push(`${personId}: failed to fetch`);
        continue;
      }
      const person = await getRes.json();
      const currentGroups: { id: string }[] = (person.data?.groups ?? []).map(
        (g: { id: string }) => ({ id: g.id })
      );

      // Skip if already in the group
      if (currentGroups.some((g) => g.id === targetGroupId)) {
        added++;
        continue;
      }

      // Merge existing groups + new group
      const updatedGroups = [...currentGroups, { id: targetGroupId }];

      const patchRes = await fetch(`${FOLK_BASE}/people/${personId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groups: updatedGroups }),
      });

      if (!patchRes.ok) {
        const text = await patchRes.text();
        errors.push(`${personId}: ${text}`);
        continue;
      }

      added++;
    } catch (err) {
      errors.push(
        `${personId}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return NextResponse.json({ added, errors });
}
