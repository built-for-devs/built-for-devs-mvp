import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDevProfile, getDevEvaluations } from "@/lib/dev/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function statusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    invited: "default",
    accepted: "default",
    recording: "default",
    submitted: "secondary",
    in_review: "secondary",
    approved: "default",
    paid: "default",
    declined: "outline",
    expired: "outline",
    rejected: "destructive",
  };
  return variants[status] ?? "secondary";
}

function statusText(evaluation: {
  status: string | null;
  invitation_expires_at: string | null;
  recording_deadline: string | null;
  payout_amount: number | null;
  paid_at: string | null;
}) {
  switch (evaluation.status) {
    case "invited": {
      const expires = evaluation.invitation_expires_at
        ? new Date(evaluation.invitation_expires_at).toLocaleDateString()
        : "soon";
      return `Invited — expires ${expires}`;
    }
    case "accepted":
    case "recording": {
      const deadline = evaluation.recording_deadline
        ? new Date(evaluation.recording_deadline).toLocaleDateString()
        : "soon";
      return `Recording — due ${deadline}`;
    }
    case "submitted":
    case "in_review":
      return "Under Review";
    case "approved":
      return `Approved — $${evaluation.payout_amount ?? 0} payment queued`;
    case "paid":
      return `Paid — $${evaluation.payout_amount ?? 0}`;
    case "declined":
      return "Declined";
    case "expired":
      return "Expired";
    case "rejected":
      return "Not approved";
    default:
      return evaluation.status ?? "Unknown";
  }
}

export default async function DevEvaluationsPage() {
  const supabase = await createClient();
  const [developer, evaluations] = await Promise.all([
    getDevProfile(supabase),
    getDevEvaluations(supabase),
  ]);

  if (!developer) {
    return null;
  }

  if (evaluations.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">My Evaluations</h1>
        <div className="mt-8 rounded-md border p-8 text-center">
          {!developer.profile_complete ? (
            <div>
              <p className="text-muted-foreground">
                Complete your profile to receive evaluation invitations.
              </p>
              <Link
                href="/dev/profile"
                className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
              >
                Go to Profile
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No evaluations yet. You&apos;ll receive invitations when matched
              to projects.
            </p>
          )}
        </div>
      </div>
    );
  }

  const dimmedStatuses = ["declined", "expired", "rejected"];

  return (
    <div>
      <h1 className="text-2xl font-semibold">My Evaluations</h1>
      <div className="mt-6 space-y-3">
        {evaluations.map((evaluation) => (
          <Link
            key={evaluation.id}
            href={`/dev/evaluations/${evaluation.id}`}
          >
            <Card
              className={`transition-colors hover:bg-muted/50 ${
                dimmedStatuses.includes(evaluation.status ?? "")
                  ? "opacity-60"
                  : ""
              }`}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <p className="font-medium">
                    {evaluation.product_name ?? "Untitled Project"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {statusText(evaluation)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {(evaluation.status === "approved" ||
                    evaluation.status === "paid") &&
                    evaluation.payout_amount && (
                      <span className="text-sm font-medium">
                        ${evaluation.payout_amount}
                      </span>
                    )}
                  <Badge variant={statusBadge(evaluation.status ?? "")}>
                    {(evaluation.status ?? "unknown").replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {evaluation.invited_at
                      ? new Date(evaluation.invited_at).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
