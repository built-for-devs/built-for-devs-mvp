"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface CreateProjectDialogProps {
  companies: { id: string; name: string }[];
}

export function CreateProjectDialog({ companies }: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [numEvaluations, setNumEvaluations] = useState("5");
  const [pricePerEvaluation, setPricePerEvaluation] = useState("399");

  const totalPrice =
    (parseInt(numEvaluations) || 0) * (parseFloat(pricePerEvaluation) || 0);

  function resetForm() {
    setCompanyId("");
    setProductName("");
    setProductDescription("");
    setProductUrl("");
    setProductCategory("");
    setNumEvaluations("5");
    setPricePerEvaluation("500");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !productName.trim()) return;

    startTransition(async () => {
      const result = await createProject({
        company_id: companyId,
        product_name: productName.trim(),
        product_description: productDescription.trim() || undefined,
        product_url: productUrl.trim() || undefined,
        product_category: productCategory.trim() || undefined,
        num_evaluations: parseInt(numEvaluations) || 5,
        price_per_evaluation: parseFloat(pricePerEvaluation) || 399,
      });

      if (!result.success) {
        setError(result.error ?? "Failed to create project");
        return;
      }

      setOpen(false);
      resetForm();
      if (result.id) {
        router.push(`/admin/projects/${result.id}`);
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Project
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
            <DialogTitle>Create Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="space-y-2">
              <Label>Company *</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-name">Product Name *</Label>
              <Input
                id="project-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="My Developer Tool"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-desc">Product Description</Label>
              <Textarea
                id="project-desc"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Brief description of the product..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-url">Product URL</Label>
                <Input
                  id="project-url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-category">Category</Label>
                <Input
                  id="project-category"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  placeholder="Developer Tools"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-num-evals">Number of Evaluations *</Label>
                <Input
                  id="project-num-evals"
                  type="number"
                  min="1"
                  value={numEvaluations}
                  onChange={(e) => setNumEvaluations(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-price">Price Per Evaluation ($)</Label>
                <Input
                  id="project-price"
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
                Total project price: <span className="font-medium text-foreground">${totalPrice.toLocaleString()}</span>
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
              <Button
                type="submit"
                disabled={isPending || !companyId || !productName.trim()}
              >
                {isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
