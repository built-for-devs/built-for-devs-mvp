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

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5_000, 15_000, 30_000]; // 5s, 15s, 30s

export async function evaluateCrawlData(
  targetUrl: string,
  crawlResult: CrawlResult
): Promise<EvaluationResult> {
  const client = getClient();
  const userMessage = buildUserMessage(targetUrl, crawlResult);

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
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
    } catch (err) {
      lastError = err;

      // Retry on overloaded (529) or rate limit (429) errors
      const isRetryable =
        err instanceof Anthropic.APIError &&
        (err.status === 529 || err.status === 429);

      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(
          `Claude API ${err.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay / 1000}s...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  // Should never reach here, but just in case
  throw lastError;
}
