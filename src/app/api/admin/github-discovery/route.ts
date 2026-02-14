import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { findGitHubUser, type EnrichmentInput } from "@/lib/enrichment";
import { searchGitHubProfile } from "@/lib/serper";
import { submitGitHubDiscovery } from "@/lib/sixtyfour";

export const maxDuration = 60;

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface DiscoveryResult {
  developerId: string;
  name: string;
  status: "found" | "submitted" | "no_linkedin" | "already_has_github" | "failed";
  githubUrl?: string;
  taskId?: string;
  source?: string;
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
    .select("id, github_url, linkedin_url, job_title, current_company, city, profiles!inner(full_name, email)")
    .in("id", developerIds);

  if (fetchError || !developers) {
    return NextResponse.json({ error: "Failed to fetch developers" }, { status: 500 });
  }

  const results: DiscoveryResult[] = [];

  for (const dev of developers) {
    const profile = dev.profiles as unknown as { full_name: string; email: string };

    // 1. Skip if already has GitHub URL
    if (dev.github_url) {
      results.push({
        developerId: dev.id,
        name: profile.full_name,
        status: "already_has_github",
        githubUrl: dev.github_url,
      });
      continue;
    }

    // 2. Try free GitHub API search (email, then name+company)
    try {
      const input: EnrichmentInput = {
        folkId: "",
        name: profile.full_name,
        email: profile.email,
        company: dev.current_company,
      };
      const username = await findGitHubUser(input);
      if (username) {
        const githubUrl = `https://github.com/${username}`;
        await serviceClient
          .from("developers")
          .update({ github_url: githubUrl })
          .eq("id", dev.id);
        results.push({
          developerId: dev.id,
          name: profile.full_name,
          status: "found",
          githubUrl,
          source: "github_api",
        });
        continue;
      }
    } catch (err) {
      console.error(`GitHub API search failed for ${profile.full_name}:`, err);
    }

    // 3. Try Serper Google search
    try {
      const username = await searchGitHubProfile(profile.full_name, dev.current_company);
      if (username) {
        const githubUrl = `https://github.com/${username}`;
        await serviceClient
          .from("developers")
          .update({ github_url: githubUrl })
          .eq("id", dev.id);
        results.push({
          developerId: dev.id,
          name: profile.full_name,
          status: "found",
          githubUrl,
          source: "serper",
        });
        continue;
      }
    } catch (err) {
      console.error(`Serper search failed for ${profile.full_name}:`, err);
    }

    // 4. Try SixtyFour (async) if developer has LinkedIn
    if (dev.linkedin_url) {
      try {
        const taskId = await submitGitHubDiscovery({
          name: profile.full_name,
          title: dev.job_title,
          company: dev.current_company,
          location: dev.city,
          linkedin: dev.linkedin_url,
        });
        // Save task ID to developer record for background collection
        await serviceClient
          .from("developers")
          .update({ sixtyfour_task_id: taskId })
          .eq("id", dev.id);
        results.push({
          developerId: dev.id,
          name: profile.full_name,
          status: "submitted",
          taskId,
        });
        continue;
      } catch (err) {
        console.error(`SixtyFour submit failed for ${profile.full_name}:`, err);
        results.push({
          developerId: dev.id,
          name: profile.full_name,
          status: "failed",
        });
        continue;
      }
    }

    // 5. No LinkedIn — needs manual GitHub URL
    results.push({
      developerId: dev.id,
      name: profile.full_name,
      status: "no_linkedin",
    });
  }

  return NextResponse.json({ results });
}
