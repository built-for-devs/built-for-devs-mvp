import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("scores")
    .select("status, error_message")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Score not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: data.status,
    error_message: data.error_message,
  });
}
