import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const key = process.env.FOLK_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "FOLK_API_KEY not set" }, { status: 500 });
  }

  const res = await fetch(`https://api.folk.app/v1/people/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Folk delete failed: ${text}` },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true });
}
