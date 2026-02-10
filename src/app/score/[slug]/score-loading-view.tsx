"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Preparing your evaluation...",
  crawling: "Crawling your website...",
  evaluating: "Analyzing developer experience across 12 categories...",
  complete: "Your report is ready!",
  failed: "Something went wrong.",
};

const STEPS = ["pending", "crawling", "evaluating"];

function isStepActive(currentStatus: string, step: string): boolean {
  const order = ["pending", "crawling", "evaluating", "complete"];
  return order.indexOf(currentStatus) >= order.indexOf(step);
}

interface Props {
  slug: string;
  initialStatus: string;
}

export function ScoreLoadingView({ slug, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/score/${slug}/status`);
      const data = await res.json();
      setStatus(data.status);

      if (data.status === "complete") {
        router.refresh();
        return true;
      }

      if (data.status === "failed") {
        setErrorMessage(
          data.error_message ?? "An unexpected error occurred."
        );
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [slug, router]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const done = await poll();
      if (done) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [poll]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-6 w-full max-w-md">
        <CardContent className="space-y-6 pt-6 text-center">
          {status !== "failed" && (
            <>
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <div className="space-y-2">
                <p className="font-medium">
                  {STATUS_MESSAGES[status] ?? "Processing..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  This usually takes 30-60 seconds. Don&apos;t close this page.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                {STEPS.map((step) => (
                  <div
                    key={step}
                    className={`h-2 w-12 rounded-full transition-colors ${
                      isStepActive(status, step)
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="space-y-2">
                <p className="font-medium text-destructive">
                  Evaluation Failed
                </p>
                <p className="text-sm text-muted-foreground">{errorMessage}</p>
              </div>
              <Button
                onClick={() => router.push("/score")}
                variant="outline"
              >
                Try another URL
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
