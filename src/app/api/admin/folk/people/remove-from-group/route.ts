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
        const text = await getRes.text();
        console.error(`[RemoveFromGroup] GET failed for ${personId}: ${getRes.status} ${text}`);
        errors.push(`${personId}: failed to fetch (${getRes.status})`);
        continue;
      }
      const person = await getRes.json();
      const rawGroups = person.data?.groups ?? [];
      const currentGroups: { id: string }[] = rawGroups.map(
        (g: { id: string }) => ({ id: g.id })
      );

      console.log(`[RemoveFromGroup] ${personId}: current groups =`, JSON.stringify(currentGroups.map((g: { id: string }) => g.id)));
      console.log(`[RemoveFromGroup] ${personId}: removing groupId = ${groupId}`);

      // Filter out the target group
      const updatedGroups = currentGroups.filter((g) => g.id !== groupId);

      if (updatedGroups.length === currentGroups.length) {
        console.log(`[RemoveFromGroup] ${personId}: group not found in current groups, skipping`);
        removed++;
        continue;
      }

      const patchBody = { groups: updatedGroups };
      console.log(`[RemoveFromGroup] ${personId}: PATCH body =`, JSON.stringify(patchBody));

      const patchRes = await fetch(`${FOLK_BASE}/people/${personId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patchBody),
      });

      if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error(`[RemoveFromGroup] PATCH failed for ${personId}: ${patchRes.status} ${text}`);
        errors.push(`${personId}: PATCH failed (${patchRes.status}): ${text}`);
        continue;
      }

      const patchData = await patchRes.json();
      console.log(`[RemoveFromGroup] ${personId}: PATCH success, response groups =`, JSON.stringify((patchData.data?.groups ?? []).map((g: { id: string }) => g.id)));
      removed++;
    } catch (err) {
      console.error(`[RemoveFromGroup] Exception for ${personId}:`, err);
      errors.push(
        `${personId}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return NextResponse.json({ removed, errors });
}
