"use client";

import { NotesEditor } from "@/components/admin/notes-editor";
import { updateCompanyNotes } from "@/lib/admin/actions";

export function CompanyNotesEditor({
  companyId,
  initialValue,
}: {
  companyId: string;
  initialValue: string | null;
}) {
  return (
    <NotesEditor
      initialValue={initialValue}
      onSave={(notes) => updateCompanyNotes(companyId, notes)}
    />
  );
}
