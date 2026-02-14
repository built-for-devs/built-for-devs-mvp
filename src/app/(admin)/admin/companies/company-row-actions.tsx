"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { updateCompany, deleteCompany } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

interface CompanyData {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
}

export function CompanyRowActions({ company }: { company: CompanyData }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(company.name);
  const [website, setWebsite] = useState(company.website ?? "");
  const [industry, setIndustry] = useState(company.industry ?? "");
  const [size, setSize] = useState(company.size ?? "");

  function resetForm() {
    setName(company.name);
    setWebsite(company.website ?? "");
    setIndustry(company.industry ?? "");
    setSize(company.size ?? "");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await updateCompany(company.id, {
        name: name.trim(),
        website: website.trim() || undefined,
        industry: industry.trim() || undefined,
        size: size.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to update company");
        return;
      }

      setEditOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${company.id}`}>Name *</Label>
              <Input
                id={`edit-name-${company.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-website-${company.id}`}>Website</Label>
              <Input
                id={`edit-website-${company.id}`}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-industry-${company.id}`}>Industry</Label>
              <Input
                id={`edit-industry-${company.id}`}
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-size-${company.id}`}>Company Size</Label>
              <Input
                id={`edit-size-${company.id}`}
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete company"
        description={`This will permanently delete "${company.name}" and all associated data. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={isPending}
        onConfirm={() => {
          startTransition(async () => {
            await deleteCompany(company.id);
            router.refresh();
          });
        }}
      />
    </>
  );
}
