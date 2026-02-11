"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { deleteCompany } from "@/lib/admin/actions";

export function DeleteCompanyButton({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowConfirm(true)}
      >
        Delete Company
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Delete company"
        description={`This will permanently delete "${companyName}" and all associated data. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isPending}
        onConfirm={() => {
          startTransition(async () => {
            await deleteCompany(companyId);
            router.push("/admin/companies");
          });
        }}
      />
    </>
  );
}
