import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { findGitHubUser, type EnrichmentInput } from "@/lib/enrichment";
import { searchGitHubProfile, crawlForGitHub, findGitHubViaWebsite } from "@/lib/serper";

export const maxDuration = 120;

function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

interface DiscoveryResult {
  developerId: string;
  name: string;
  status: "found" | "not_found" | "already_has_github" | "failed";
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
    .select("id, github_url, linkedin_url, website_url, job_title, current_company, city, profiles!inner(full_name, email)")
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

    // 2. Try free GitHub API search (email, LinkedIn slug, then name+company)
    try {
      const input: EnrichmentInput = {
        folkId: "",
        name: profile.full_name,
        email: profile.email,
        company: dev.current_company,
        linkedinUrl: dev.linkedin_url,
      };
      const username = await findGitHubUser(input);
      if (username) {
        const githubUrl = `https://github.com/${username}`;
        await serviceClient
          .from("developers")
          .update({ github_url: githubUrl })
          .eq("id", dev.id);
        console.log(`[Discovery] ${profile.full_name}: found via GitHub API → @${username}`);
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

    // 3. Try Serper Google search (multiple query strategies)
    try {
      const username = await searchGitHubProfile(profile.full_name, dev.current_company, dev.linkedin_url);
      if (username) {
        const githubUrl = `https://github.com/${username}`;
        await serviceClient
          .from("developers")
          .update({ github_url: githubUrl })
          .eq("id", dev.id);
        console.log(`[Discovery] ${profile.full_name}: found via Serper → @${username}`);
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

    // 4. Crawl existing website_url for GitHub links
    if (dev.website_url) {
      try {
        const username = await crawlForGitHub(dev.website_url);
        if (username) {
          const githubUrl = `https://github.com/${username}`;
          await serviceClient
            .from("developers")
            .update({ github_url: githubUrl })
            .eq("id", dev.id);
          console.log(`[Discovery] ${profile.full_name}: found via website crawl → @${username}`);
          results.push({
            developerId: dev.id,
            name: profile.full_name,
            status: "found",
            githubUrl,
            source: "website_crawl",
          });
          continue;
        }
      } catch (err) {
        console.error(`Website crawl failed for ${profile.full_name}:`, err);
      }
    }

    // 5. Google for their website, then crawl it for GitHub links
    try {
      const username = await findGitHubViaWebsite(profile.full_name, dev.current_company);
      if (username) {
        const githubUrl = `https://github.com/${username}`;
        await serviceClient
          .from("developers")
          .update({ github_url: githubUrl })
          .eq("id", dev.id);
        console.log(`[Discovery] ${profile.full_name}: found via website Google → @${username}`);
        results.push({
          developerId: dev.id,
          name: profile.full_name,
          status: "found",
          githubUrl,
          source: "website_google",
        });
        continue;
      }
    } catch (err) {
      console.error(`Website Google search failed for ${profile.full_name}:`, err);
    }

    // 6. Not found — needs manual GitHub URL entry or SixtyFour
    console.log(`[Discovery] ${profile.full_name}: not found via any method`);
    results.push({
      developerId: dev.id,
      name: profile.full_name,
      status: "not_found",
    });
  }

  return NextResponse.json({ results });
}
