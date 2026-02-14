"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReEnrichButton({ developerId }: { developerId: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ status: string; error?: string } | null>(null);

  async function handleEnrich() {
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/re-enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerIds: [developerId] }),
      });

      if (!res.ok) {
        const data = await res.json();
        setResult({ status: "failed", error: data.error });
        return;
      }

      const data = await res.json();
      const r = data.results?.[0];
      setResult({ status: r?.status ?? "failed", error: r?.error });

      if (r?.status !== "failed") {
        router.refresh();
      }
    } catch {
      setResult({ status: "failed", error: "Network error" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleEnrich}
        disabled={running}
      >
        {running ? (
          <>
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            Enriching...
          </>
        ) : (
          <>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Enrich
          </>
        )}
      </Button>
      {result && result.status !== "failed" && (
        <span className="text-xs text-green-600">Updated</span>
      )}
      {result?.error && (
        <span className="text-xs text-red-600">{result.error}</span>
      )}
    </div>
  );
}
