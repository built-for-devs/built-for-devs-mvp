import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { pollGitHubDiscovery } from "@/lib/sixtyfour";

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface PollTask {
  developerId: string;
  taskId: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tasks } = (await request.json()) as { tasks: PollTask[] };

  if (!tasks?.length) {
    return NextResponse.json({ error: "tasks required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const results = [];

  for (const task of tasks) {
    const result = await pollGitHubDiscovery(task.taskId);

    if (result.status === "completed" && result.githubUrl) {
      // Write-through: save GitHub URL to developer record immediately
      await serviceClient
        .from("developers")
        .update({ github_url: result.githubUrl })
        .eq("id", task.developerId);
    }

    results.push({
      developerId: task.developerId,
      taskId: task.taskId,
      status: result.status,
      githubUrl: result.githubUrl,
      confidenceScore: result.confidenceScore,
    });
  }

  return NextResponse.json({ results });
}
