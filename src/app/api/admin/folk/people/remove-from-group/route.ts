import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FOLK_BASE = "https://api.folk.app/v1";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function folkFetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 5000) : 2000;
        console.log(`[RemoveFromGroup] 429 rate limited, waiting ${waitMs}ms before retry ${attempt + 1}`);
        await sleep(waitMs);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === maxRetries) throw err;
      await sleep(1000);
    }
  }
  // Final attempt with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

export const maxDuration = 60;

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

  const headers = { Authorization: `Bearer ${key}` };
  let removed = 0;
  const errors: string[] = [];

  for (let i = 0; i < personIds.length; i++) {
    const personId = personIds[i];

    // Throttle: wait between requests to avoid 429
    if (i > 0) await sleep(500);

    try {
      const getRes = await folkFetchWithRetry(
        `${FOLK_BASE}/people/${personId}`,
        { headers }
      );
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

      // Filter out the target group
      const updatedGroups = currentGroups.filter((g) => g.id !== groupId);

      if (updatedGroups.length === currentGroups.length) {
        // Group not found — treat as already removed
        removed++;
        continue;
      }

      // Throttle before PATCH
      await sleep(300);

      const patchRes = await folkFetchWithRetry(
        `${FOLK_BASE}/people/${personId}`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ groups: updatedGroups }),
        }
      );

      if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error(`[RemoveFromGroup] PATCH failed for ${personId}: ${patchRes.status} ${text}`);
        errors.push(`${personId}: PATCH failed (${patchRes.status}): ${text}`);
        continue;
      }

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
