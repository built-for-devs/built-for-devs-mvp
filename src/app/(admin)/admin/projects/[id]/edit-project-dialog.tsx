"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

interface EditProjectDialogProps {
  project: {
    id: string;
    product_name: string;
    product_description: string | null;
    product_url: string | null;
    product_category: string | null;
    num_evaluations: number;
    price_per_evaluation: number;
  };
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [productName, setProductName] = useState(project.product_name);
  const [productDescription, setProductDescription] = useState(
    project.product_description ?? ""
  );
  const [productUrl, setProductUrl] = useState(project.product_url ?? "");
  const [productCategory, setProductCategory] = useState(
    project.product_category ?? ""
  );
  const [numEvaluations, setNumEvaluations] = useState(
    String(project.num_evaluations)
  );
  const [pricePerEvaluation, setPricePerEvaluation] = useState(
    String(project.price_per_evaluation)
  );

  const totalPrice =
    (parseInt(numEvaluations) || 0) * (parseFloat(pricePerEvaluation) || 0);

  function resetForm() {
    setProductName(project.product_name);
    setProductDescription(project.product_description ?? "");
    setProductUrl(project.product_url ?? "");
    setProductCategory(project.product_category ?? "");
    setNumEvaluations(String(project.num_evaluations));
    setPricePerEvaluation(String(project.price_per_evaluation));
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) return;

    startTransition(async () => {
      const result = await updateProject(project.id, {
        product_name: productName.trim(),
        product_description: productDescription.trim() || undefined,
        product_url: productUrl.trim() || undefined,
        product_category: productCategory.trim() || undefined,
        num_evaluations: parseInt(numEvaluations) || project.num_evaluations,
        price_per_evaluation:
          parseFloat(pricePerEvaluation) || project.price_per_evaluation,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to update project");
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-product-name">Product Name *</Label>
              <Input
                id="edit-product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-product-desc">Product Description</Label>
              <Textarea
                id="edit-product-desc"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-product-url">Product URL</Label>
                <Input
                  id="edit-product-url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-category">Category</Label>
                <Input
                  id="edit-product-category"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-num-evals">Number of Evaluations</Label>
                <Input
                  id="edit-num-evals"
                  type="number"
                  min="1"
                  value={numEvaluations}
                  onChange={(e) => setNumEvaluations(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price Per Evaluation ($)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerEvaluation}
                  onChange={(e) => setPricePerEvaluation(e.target.value)}
                />
              </div>
            </div>
            {totalPrice > 0 && (
              <p className="text-sm text-muted-foreground">
                Total: <span className="font-medium text-foreground">${totalPrice.toLocaleString()}</span>
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !productName.trim()}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
