import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  roleTypeOptions,
  seniorityOptions,
  languageOptions,
  frameworkOptions,
  databaseOptions,
  cloudPlatformOptions,
  devopsToolOptions,
  cicdToolOptions,
  testingFrameworkOptions,
  apiExperienceOptions,
  operatingSystemOptions,
  industryOptions,
  companySizeOptions,
  buyingInfluenceOptions,
  paidToolOptions,
  ossActivityOptions,
} from "@/lib/admin/filter-options";
import type { IcpCriteria, IcpSuggestResponse } from "@/types/icp";
import { ICP_CRITERIA_KEYS } from "@/types/icp";

// Lazy-init Anthropic client (same pattern as enrichment.ts)
let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// Valid options lookup for validation
const validOptions: Record<keyof IcpCriteria, readonly string[]> = {
  role_types: roleTypeOptions,
  seniority: seniorityOptions,
  languages: languageOptions,
  frameworks: frameworkOptions,
  databases: databaseOptions,
  cloud_platforms: cloudPlatformOptions,
  devops_tools: devopsToolOptions,
  cicd_tools: cicdToolOptions,
  testing_frameworks: testingFrameworkOptions,
  api_experience: apiExperienceOptions,
  operating_systems: operatingSystemOptions,
  industries: industryOptions,
  company_size: companySizeOptions,
  buying_influence: buyingInfluenceOptions,
  paid_tools: paidToolOptions,
  open_source_activity: ossActivityOptions,
};

function validateCriteria(raw: Record<string, unknown>): IcpCriteria {
  const result: Record<string, string[]> = {};
  for (const key of ICP_CRITERIA_KEYS) {
    const values = raw[key];
    if (!Array.isArray(values)) {
      result[key] = [];
      continue;
    }
    const validSet = new Set(validOptions[key].map((v) => v.toLowerCase()));
    result[key] = (values as string[]).filter((v) =>
      validSet.has(String(v).toLowerCase())
    );
  }
  return result as unknown as IcpCriteria;
}

const SYSTEM_PROMPT = `You are helping a product company find the right developers to evaluate their product. You'll be given a product URL and optionally a description. Use the URL to understand what the product does and who it's for, then suggest the ideal developer profile (ICP) criteria.

Guidelines:
- Focus on the 3-6 most important criteria. Don't fill every field - empty arrays are fine for less relevant fields.
- For languages and frameworks, pick the ones most relevant to evaluating THIS product based on its URL and tech stack.
- For seniority, consider who has enough experience to give meaningful feedback.
- For buying_influence, consider who makes tool decisions at companies that would buy this product.
- Only include criteria that are meaningfully relevant to the product.
- You MUST only use values from the predefined lists provided.

Return ONLY a JSON object (no markdown fences) with this shape:
{
  "criteria": { <each field as an array of strings from the valid options> },
  "reasoning": { <for each non-empty criteria field, a 1-sentence explanation of why> },
  "overall_reasoning": "<2-3 sentence summary of your ICP recommendation>"
}`;

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: { description?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const url = body.url?.trim() ?? "";
  const description = body.description?.trim() ?? "";

  if (!url && !description) {
    return NextResponse.json(
      { error: "Please provide a product URL or description." },
      { status: 400 }
    );
  }

  const optionsList = Object.entries(validOptions)
    .map(([key, values]) => `- ${key}: ${(values as readonly string[]).join(", ")}`)
    .join("\n");

  const promptParts: string[] = [];
  if (url) promptParts.push(`Product URL: ${url}`);
  if (description) promptParts.push(`Product description: ${description}`);
  promptParts.push(`\nAvailable values for each criterion:\n${optionsList}`);

  const userPrompt = promptParts.join("\n");

  try {
    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text
      .replace(/```json?\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsed: {
      criteria?: Record<string, unknown>;
      reasoning?: Record<string, string>;
      overall_reasoning?: string;
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude ICP response:", cleaned);
      return NextResponse.json(
        { error: "Failed to generate suggestions. Please try again." },
        { status: 500 }
      );
    }

    const criteria = validateCriteria(parsed.criteria ?? {});
    const reasoning: Record<string, string> = {};
    if (parsed.reasoning && typeof parsed.reasoning === "object") {
      for (const [key, val] of Object.entries(parsed.reasoning)) {
        if (typeof val === "string") reasoning[key] = val;
      }
    }

    const response: IcpSuggestResponse = {
      criteria,
      reasoning,
      overallReasoning: parsed.overall_reasoning ?? "",
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("ICP suggestion error:", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions. Please try again." },
      { status: 500 }
    );
  }
}
