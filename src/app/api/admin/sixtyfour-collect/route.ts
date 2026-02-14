import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { pollGitHubDiscovery } from "@/lib/sixtyfour";

export const maxDuration = 120;

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface CollectResult {
  developerId: string;
  name: string;
  status: "found" | "pending" | "not_found" | "failed";
  githubUrl?: string;
  fieldsFound?: string[];
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const serviceClient = createServiceClient();

  // Find all developers with pending SixtyFour tasks
  const { data: pending, error } = await serviceClient
    .from("developers")
    .select("id, sixtyfour_task_id, profiles!inner(full_name)")
    .not("sixtyfour_task_id", "is", null);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch pending tasks" }, { status: 500 });
  }

  if (!pending?.length) {
    return NextResponse.json({ results: [], message: "No pending tasks" });
  }

  const results: CollectResult[] = [];

  for (const dev of pending) {
    const profile = dev.profiles as unknown as { full_name: string };
    const taskId = dev.sixtyfour_task_id as string;

    try {
      const result = await pollGitHubDiscovery(taskId);

      if (result.status === "completed") {
        // Build update payload from all returned fields
        const update: Record<string, string | null> = { sixtyfour_task_id: null };
        const fieldsFound: string[] = [];

        if (result.githubUrl) {
          update.github_url = result.githubUrl;
          fieldsFound.push("github");
        }
        if (result.personalEmail) {
          update.personal_email = result.personalEmail;
          fieldsFound.push("personal email");
        }
        if (result.twitterUrl) {
          update.twitter_url = result.twitterUrl;
          fieldsFound.push("twitter");
        }
        if (result.websiteUrl) {
          update.website_url = result.websiteUrl;
          fieldsFound.push("website");
        }

        console.log(`SixtyFour collect for ${profile.full_name}: updating`, update);
        const { error: updateError } = await serviceClient
          .from("developers")
          .update(update)
          .eq("id", dev.id);

        if (updateError) {
          console.error(`SixtyFour DB update failed for ${profile.full_name}:`, updateError);
        }

        if (fieldsFound.length > 0) {
          results.push({
            developerId: dev.id,
            name: profile.full_name,
            status: "found",
            githubUrl: result.githubUrl ?? undefined,
            fieldsFound,
          });
        } else {
          results.push({
            developerId: dev.id,
            name: profile.full_name,
            status: "not_found",
          });
        }
      } else if (result.status === "failed") {
        // Failed — clear task ID
        await serviceClient
          .from("developers")
          .update({ sixtyfour_task_id: null })
          .eq("id", dev.id);

        results.push({
          developerId: dev.id,
          name: profile.full_name,
          status: "failed",
        });
      } else {
        // Still pending/processing — leave task ID
        results.push({
          developerId: dev.id,
          name: profile.full_name,
          status: "pending",
        });
      }
    } catch (err) {
      console.error(`SixtyFour poll failed for ${profile.full_name}:`, err);
      results.push({
        developerId: dev.id,
        name: profile.full_name,
        status: "failed",
      });
    }
  }

  return NextResponse.json({ results });
}
