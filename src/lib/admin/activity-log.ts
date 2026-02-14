import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Log a developer activity event. Non-blocking — errors are logged
 * to console but never fail the parent operation.
 */
export async function logDeveloperActivity(
  supabase: SupabaseClient,
  developerId: string,
  actorId: string | null,
  action: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await (supabase as any)
      .from("developer_activity_logs")
      .insert({
        developer_id: developerId,
        actor_id: actorId,
        action,
        details: details ?? {},
      });

    if (error) {
      console.error("Activity log insert failed:", error.message);
    }
  } catch (err) {
    console.error("Activity log error:", err);
  }
}
