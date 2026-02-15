"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject } from "@/lib/admin/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteProjectButtonProps {
  projectId: string;
  projectName: string;
}

export function DeleteProjectButton({
  projectId,
  projectName,
}: DeleteProjectButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProject(projectId);
      if (!result.success) {
        setError(result.error ?? "Failed to delete project");
        return;
      }
      router.push("/admin/projects");
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setError(null);
        }}
        title="Delete Project"
        description={`Permanently delete "${projectName}" and all its evaluations? This cannot be undone.`}
        confirmLabel="Delete Project"
        onConfirm={handleDelete}
        destructive
        loading={isPending}
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </>
  );
}
