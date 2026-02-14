import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { submitGitHubDiscovery } from "@/lib/sixtyfour";

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { developerIds } = (await request.json()) as { developerIds: string[] };

  if (!developerIds?.length) {
    return NextResponse.json({ error: "developerIds required" }, { status: 400 });
  }
  if (developerIds.length > 10) {
    return NextResponse.json({ error: "Maximum 10 per batch" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { data: developers, error: fetchError } = await serviceClient
    .from("developers")
    .select("id, linkedin_url, job_title, current_company, city, profiles!inner(full_name)")
    .in("id", developerIds);

  if (fetchError || !developers) {
    return NextResponse.json({ error: "Failed to fetch developers" }, { status: 500 });
  }

  const results: { developerId: string; name: string; status: string; taskId?: string }[] = [];

  for (const dev of developers) {
    const profile = dev.profiles as unknown as { full_name: string };

    if (!dev.linkedin_url) {
      results.push({ developerId: dev.id, name: profile.full_name, status: "no_linkedin" });
      continue;
    }

    try {
      const taskId = await submitGitHubDiscovery({
        name: profile.full_name,
        title: dev.job_title,
        company: dev.current_company,
        location: dev.city,
        linkedin: dev.linkedin_url,
      });

      await serviceClient
        .from("developers")
        .update({ sixtyfour_task_id: taskId })
        .eq("id", dev.id);

      results.push({ developerId: dev.id, name: profile.full_name, status: "submitted", taskId });
    } catch (err) {
      console.error(`SixtyFour submit failed for ${profile.full_name}:`, err);
      results.push({ developerId: dev.id, name: profile.full_name, status: "failed" });
    }
  }

  return NextResponse.json({ results });
}
