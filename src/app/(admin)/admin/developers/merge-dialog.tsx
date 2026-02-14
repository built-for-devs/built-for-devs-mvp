"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, GitMerge, Loader2 } from "lucide-react";
import { mergeDevelopers } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developerIds: [string, string];
  developerNames: Record<string, string>;
  developerEmails: Record<string, string>;
  onComplete: () => void;
}

export function MergeDialog({
  open,
  onOpenChange,
  developerIds,
  developerNames,
  developerEmails,
  onComplete,
}: MergeDialogProps) {
  const router = useRouter();
  const [primaryId, setPrimaryId] = useState<string>(developerIds[0]);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
    mergedFields: string[];
  } | null>(null);

  const secondaryId = primaryId === developerIds[0] ? developerIds[1] : developerIds[0];

  function handleMerge() {
    startTransition(async () => {
      const res = await mergeDevelopers(primaryId, secondaryId);
      setResult(res);
      if (res.success) {
        router.refresh();
        onComplete();
      }
    });
  }

  function handleClose() {
    onOpenChange(false);
    setResult(null);
    setPrimaryId(developerIds[0]);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Merge Developers
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the <strong>primary</strong> record to keep. The other record&apos;s data
              will be merged in (filling blank fields), and then it will be deleted.
            </p>

            <RadioGroup value={primaryId} onValueChange={setPrimaryId}>
              {developerIds.map((id) => (
                <div
                  key={id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <RadioGroupItem value={id} id={`dev-${id}`} className="mt-0.5" />
                  <Label htmlFor={`dev-${id}`} className="flex-1 cursor-pointer space-y-0.5">
                    <div className="text-sm font-medium">{developerNames[id]}</div>
                    <div className="text-xs text-muted-foreground">{developerEmails[id]}</div>
                    <div className="text-xs text-muted-foreground">
                      {primaryId === id ? "Will be kept (primary)" : "Will be merged and deleted"}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
              <strong>What happens:</strong>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li>Evaluations from &quot;{developerNames[secondaryId]}&quot; move to &quot;{developerNames[primaryId]}&quot;</li>
                <li>Empty fields on the primary are filled from the secondary</li>
                <li>&quot;{developerEmails[secondaryId]}&quot; is added as an alternative email</li>
                <li>The secondary record and auth account are permanently deleted</li>
              </ul>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isPending}>
                Cancel
              </Button>
              <Button onClick={handleMerge} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <GitMerge className="mr-1.5 h-4 w-4" />
                    Merge
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : result.success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Merge complete
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>{developerNames[secondaryId]}</strong> has been merged into{" "}
              <strong>{developerNames[primaryId]}</strong>.
            </p>
            {result.mergedFields.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Fields filled from secondary: {result.mergedFields.join(", ")}
              </p>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{result.error}</p>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
