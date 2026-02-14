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

  const { personIds, groupId } = (await request.json()) as {
    personIds: string[];
    groupId: string;
  };

  if (!personIds?.length || !groupId) {
    return NextResponse.json({ error: "personIds and groupId required" }, { status: 400 });
  }

  let removed = 0;
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

      // Filter out the target group
      const updatedGroups = currentGroups.filter((g) => g.id !== groupId);

      if (updatedGroups.length === currentGroups.length) {
        // Wasn't in the group — count as success
        removed++;
        continue;
      }

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

      removed++;
    } catch (err) {
      errors.push(
        `${personId}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return NextResponse.json({ removed, errors });
}
