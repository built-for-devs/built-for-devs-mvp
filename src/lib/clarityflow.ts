const API_BASE = "https://app.clarityflow.com/api/v1/conversations";

function getApiKey(): string {
  const key = process.env.CLARITYFLOW_API_KEY;
  if (!key) throw new Error("CLARITYFLOW_API_KEY is not set");
  return key;
}

function getAccountSlug(): string {
  const slug = process.env.CLARITYFLOW_ACCOUNT_SLUG;
  if (!slug) throw new Error("CLARITYFLOW_ACCOUNT_SLUG is not set");
  return slug;
}

interface ClarityFlowMessage {
  id: number;
  conversation_id: number;
  message_type: string;
  recorded_duration_seconds: number | null;
  text: string | null;
  message_url: string;
  embed_message_url: string;
  download_media_url: string | null;
  author: { anonymous: boolean };
}

interface ClarityFlowConversation {
  id: number;
  title: string;
  slug: string;
  conversation_url: string;
  conversation_embed_url: string;
  anyone_can_post: boolean;
  allow_anonymous_messages: boolean;
  messages: ClarityFlowMessage[];
}

async function cfFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ClarityFlow API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function createConversation(
  title: string,
  slug: string,
  options?: {
    anyone_can_post?: boolean;
    allow_anonymous_messages?: boolean;
  }
): Promise<ClarityFlowConversation> {
  return cfFetch<ClarityFlowConversation>("create_conversation", {
    method: "POST",
    body: JSON.stringify({
      title,
      slug,
      anyone_can_post: options?.anyone_can_post ?? true,
      allow_anonymous_messages: options?.allow_anonymous_messages ?? true,
    }),
  });
}

export async function getConversation(
  slug: string
): Promise<ClarityFlowConversation> {
  return cfFetch<ClarityFlowConversation>(
    `get_conversation?slug=${encodeURIComponent(slug)}`
  );
}

export async function getConversationMessages(
  slug: string
): Promise<ClarityFlowMessage[]> {
  const conversation = await getConversation(slug);
  return conversation.messages;
}

export function buildEmbedUrl(slug: string): string {
  const account = getAccountSlug();
  return `https://${account}.clarityflow.com/embeds/conversations/${account}/${slug}`;
}

export function buildConversationUrl(slug: string): string {
  const account = getAccountSlug();
  return `https://${account}/c/${slug}`;
}
