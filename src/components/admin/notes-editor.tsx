"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface NotesEditorProps {
  initialValue: string | null;
  onSave: (value: string) => Promise<{ success: boolean; error?: string }>;
}

export function NotesEditor({ initialValue, onSave }: NotesEditorProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function handleSave() {
    startTransition(async () => {
      const result = await onSave(value);
      setStatus(result.success ? "saved" : "error");
      setTimeout(() => setStatus("idle"), 2000);
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("idle");
        }}
        placeholder="Add notes..."
        rows={3}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Notes"}
        </Button>
        {status === "saved" && (
          <span className="text-sm text-green-600">Saved</span>
        )}
        {status === "error" && (
          <span className="text-sm text-destructive">Failed to save</span>
        )}
      </div>
    </div>
  );
}
