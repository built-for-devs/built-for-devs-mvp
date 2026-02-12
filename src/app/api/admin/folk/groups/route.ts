import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFolkGroups } from "@/lib/folk";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const groups = await getFolkGroups();
    return NextResponse.json({ groups });
  } catch (err) {
    console.error("Folk groups error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Folk groups" },
      { status: 500 }
    );
  }
}
