import Anthropic from "@anthropic-ai/sdk";
import type { ScoreEvaluation, CrawlResult } from "./types";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _client;
}

export interface EvaluationResult {
  evaluation: ScoreEvaluation;
  inputTokens: number;
  outputTokens: number;
}

export async function evaluateCrawlData(
  targetUrl: string,
  crawlResult: CrawlResult
): Promise<EvaluationResult> {
  const client = getClient();
  const userMessage = buildUserMessage(targetUrl, crawlResult);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  let rawJson = textBlock.text.trim();

  // Strip markdown code fences if present (defensive)
  if (rawJson.startsWith("```")) {
    rawJson = rawJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const evaluation: ScoreEvaluation = JSON.parse(rawJson);

  if (!evaluation.scores || !evaluation.summary || !evaluation.summary.final_score) {
    throw new Error("Claude response missing required fields");
  }

  return {
    evaluation,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
