"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Eye, EyeOff, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteScore, toggleScoreDirectoryHidden } from "@/lib/admin/actions";

interface ScoreActionsProps {
  scoreId: string;
  slug: string;
  domain: string;
  status: string;
  directoryHidden: boolean;
}

export function ScoreActions({
  scoreId,
  slug,
  domain,
  status,
  directoryHidden,
}: ScoreActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await fetch("/api/admin/retry-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreId }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Retry failed:", data.error);
      }
      router.refresh();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "complete" && (
            <DropdownMenuItem asChild>
              <Link href={`/score/${slug}`} target="_blank">
                View report
              </Link>
            </DropdownMenuItem>
          )}
          {status === "complete" && (
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await toggleScoreDirectoryHidden(scoreId, !directoryHidden);
                });
              }}
            >
              {directoryHidden ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Show in directory
                </>
              ) : (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide from directory
                </>
              )}
            </DropdownMenuItem>
          )}
          {status === "failed" && (
            <DropdownMenuItem disabled={retrying} onClick={handleRetry}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {retrying ? "Retrying..." : "Retry"}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete score"
        description={`This will permanently delete the score for ${domain}. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isPending}
        onConfirm={() => {
          startTransition(async () => {
            await deleteScore(scoreId);
            setShowDeleteConfirm(false);
          });
        }}
      />
    </>
  );
}
