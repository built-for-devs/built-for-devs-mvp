import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getConversation } from "@/lib/clarityflow";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.type as string | undefined;
  console.log(`ClarityFlow webhook received: ${eventType}`, body.id);

  // We only care about new messages — that's when a developer submits a recording
  if (eventType !== "new_message") {
    return NextResponse.json({ received: true });
  }

  const payload = body.payload as Record<string, unknown> | undefined;
  if (!payload) {
    console.error("ClarityFlow webhook: no payload");
    return NextResponse.json({ received: true });
  }

  // Extract the conversation slug from the payload
  // The payload structure may vary — try common field names
  const conversationSlug =
    (payload.conversation_slug as string) ??
    (payload.slug as string) ??
    null;

  const conversationId =
    (payload.conversation_id as number) ?? null;

  if (!conversationSlug && !conversationId) {
    console.error("ClarityFlow webhook: no conversation identifier in payload");
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  // Look up the evaluation by ClarityFlow conversation slug
  let evalQuery = supabase
    .from("evaluations")
    .select("id, status, clarityflow_conversation_id");

  if (conversationSlug) {
    evalQuery = evalQuery.eq("clarityflow_conversation_id", conversationSlug);
  }

  const { data: evaluation, error: evalError } = await evalQuery.maybeSingle();

  if (evalError || !evaluation) {
    console.error(
      "ClarityFlow webhook: evaluation not found for conversation",
      conversationSlug ?? conversationId,
      evalError?.message
    );
    return NextResponse.json({ received: true });
  }

  // If already submitted or beyond, skip
  const skipStatuses = ["submitted", "in_review", "approved", "rejected", "paid"];
  if (skipStatuses.includes(evaluation.status)) {
    console.log(
      `ClarityFlow webhook: evaluation ${evaluation.id} already in status ${evaluation.status}, skipping`
    );
    return NextResponse.json({ received: true });
  }

  // Fetch full conversation from ClarityFlow API to get message details
  try {
    const conversation = await getConversation(
      evaluation.clarityflow_conversation_id!
    );
    const messages = conversation.messages ?? [];
    const latestMessage = messages[messages.length - 1];

    const updateData: Record<string, unknown> = {
      status: "submitted",
      recording_completed_at: new Date().toISOString(),
    };

    if (latestMessage) {
      if (latestMessage.text) {
        updateData.transcript = latestMessage.text;
      }
      if (latestMessage.embed_message_url) {
        updateData.recording_embed_url = latestMessage.embed_message_url;
      }
    }

    const { error: updateError } = await supabase
      .from("evaluations")
      .update(updateData)
      .eq("id", evaluation.id);

    if (updateError) {
      console.error(
        "ClarityFlow webhook: failed to update evaluation:",
        updateError.message
      );
    } else {
      console.log(
        `ClarityFlow webhook: evaluation ${evaluation.id} updated to submitted`
      );
    }
  } catch (err) {
    // If we can't fetch conversation details, still mark as submitted
    console.error("ClarityFlow webhook: failed to fetch conversation:", err);

    await supabase
      .from("evaluations")
      .update({
        status: "submitted",
        recording_completed_at: new Date().toISOString(),
      })
      .eq("id", evaluation.id);
  }

  return NextResponse.json({ received: true });
}
