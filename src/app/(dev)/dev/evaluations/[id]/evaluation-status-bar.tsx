"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acceptInvitation, declineInvitation } from "@/lib/dev/actions";

interface EvaluationStatusBarProps {
  evaluation: {
    id: string;
    status: string;
    invitation_expires_at: string | null;
    recording_deadline: string | null;
    payout_amount: number | null;
    paid_at: string | null;
  };
}

export function EvaluationStatusBar({ evaluation }: EvaluationStatusBarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    const result = await acceptInvitation(evaluation.id);
    setLoading(false);
    if (result.success) {
      router.refresh();
    }
  }

  async function handleDecline() {
    setLoading(true);
    const result = await declineInvitation(evaluation.id);
    setLoading(false);
    if (result.success) {
      router.refresh();
    }
  }

  function timeRemaining(deadline: string | null) {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return "expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  }

  return (
    <Card>
      <CardContent className="py-4">
        {evaluation.status === "invited" && (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">You&apos;ve been invited to this evaluation</p>
              <p className="text-sm text-muted-foreground">
                {evaluation.invitation_expires_at
                  ? `Expires ${new Date(evaluation.invitation_expires_at).toLocaleDateString()} (${timeRemaining(evaluation.invitation_expires_at)})`
                  : "Respond to accept or decline"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDecline}
                disabled={loading}
              >
                Decline
              </Button>
              <Button onClick={handleAccept} disabled={loading}>
                {loading ? "Processing..." : "Accept"}
              </Button>
            </div>
          </div>
        )}

        {(evaluation.status === "accepted" || evaluation.status === "recording") && (
          <div>
            <p className="font-medium">Complete your evaluation</p>
            <p className="text-sm text-muted-foreground">
              {evaluation.recording_deadline
                ? `Due by ${new Date(evaluation.recording_deadline).toLocaleDateString()} (${timeRemaining(evaluation.recording_deadline)})`
                : "Complete your recording when ready"}
            </p>
          </div>
        )}

        {evaluation.status === "submitted" && (
          <div>
            <p className="font-medium">Thanks! Your evaluation is under review.</p>
            <p className="text-sm text-muted-foreground">
              We&apos;ll notify you once the review is complete.
            </p>
          </div>
        )}

        {evaluation.status === "in_review" && (
          <div>
            <p className="font-medium">Your evaluation is being reviewed</p>
            <p className="text-sm text-muted-foreground">
              We&apos;ll notify you once the review is complete.
            </p>
          </div>
        )}

        {evaluation.status === "approved" && (
          <div>
            <p className="font-medium">
              Approved! Payment of ${evaluation.payout_amount ?? 0} queued.
            </p>
            <p className="text-sm text-muted-foreground">
              Make sure your{" "}
              <Link href="/dev/profile" className="text-primary hover:underline">
                PayPal email
              </Link>{" "}
              is set up to receive payment.
            </p>
          </div>
        )}

        {evaluation.status === "paid" && (
          <div>
            <p className="font-medium">
              Payment of ${evaluation.payout_amount ?? 0} sent
              {evaluation.paid_at
                ? ` on ${new Date(evaluation.paid_at).toLocaleDateString()}`
                : ""}
              .
            </p>
          </div>
        )}

        {evaluation.status === "declined" && (
          <div>
            <p className="font-medium text-muted-foreground">
              You declined this invitation.
            </p>
          </div>
        )}

        {evaluation.status === "expired" && (
          <div>
            <p className="font-medium text-muted-foreground">
              This invitation has expired.
            </p>
          </div>
        )}

        {evaluation.status === "rejected" && (
          <div>
            <p className="font-medium text-muted-foreground">
              This evaluation was not approved.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
