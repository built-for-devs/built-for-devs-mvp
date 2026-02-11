"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { assignDeveloperToProject } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";

interface ProjectPickerDialogProps {
  developerId: string;
  existingProjectIds: string[];
}

interface ProjectRow {
  id: string;
  product_name: string;
  status: string;
  num_evaluations: number;
  companies: { name: string } | null;
  evaluation_count: number;
}

export function ProjectPickerDialog({
  developerId,
  existingProjectIds,
}: ProjectPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [payoutAmount, setPayoutAmount] = useState("149");
  const [error, setError] = useState<string | null>(null);
  const [assignedId, setAssignedId] = useState<string | null>(null);

  const fetchProjects = useCallback(
    async (query: string) => {
      setLoading(true);
      const supabase = createClient();

      let req = supabase
        .from("projects")
        .select("id, product_name, status, num_evaluations, companies(name), evaluations(count)")
        .in("status", ["paid", "matching", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (query.trim()) {
        req = req.ilike("product_name", `%${query.trim()}%`);
      }

      const { data } = await req;
      const rows = ((data ?? []) as unknown as Array<{
        id: string;
        product_name: string;
        status: string;
        num_evaluations: number;
        companies: { name: string } | null;
        evaluations: { count: number }[];
      }>)
        .filter((p) => !existingProjectIds.includes(p.id))
        .map((p) => ({
          id: p.id,
          product_name: p.product_name,
          status: p.status,
          num_evaluations: p.num_evaluations,
          companies: p.companies,
          evaluation_count: p.evaluations?.[0]?.count ?? 0,
        }));

      setProjects(rows);
      setLoading(false);
    },
    [existingProjectIds]
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchProjects(search), 300);
    return () => clearTimeout(timer);
  }, [search, open, fetchProjects]);

  function handleAssign(projectId: string) {
    setError(null);
    setAssignedId(projectId);
    startTransition(async () => {
      const result = await assignDeveloperToProject(
        projectId,
        developerId,
        parseFloat(payoutAmount) || 149
      );
      if (!result.success) {
        setError(result.error ?? "Failed to assign to project");
        setAssignedId(null);
        return;
      }
      setOpen(false);
      setSearch("");
      setAssignedId(null);
    });
  }

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    matching: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add to Project
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSearch("");
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Developer to Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects by product name..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="payout" className="whitespace-nowrap text-sm">
                  Payout $
                </Label>
                <Input
                  id="payout"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-24"
                />
              </div>
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading...
              </p>
            ) : projects.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search
                  ? "No matching projects found."
                  : "No projects available for assignment."}
              </p>
            ) : (
              <div className="max-h-[400px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Evals</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((proj) => (
                      <TableRow key={proj.id}>
                        <TableCell className="text-sm font-medium">
                          {proj.product_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {proj.companies?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`border-transparent text-xs ${statusColors[proj.status] ?? ""}`}
                          >
                            {proj.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {proj.evaluation_count}/{proj.num_evaluations}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleAssign(proj.id)}
                            disabled={isPending && assignedId === proj.id}
                          >
                            {isPending && assignedId === proj.id
                              ? "Assigning..."
                              : "Assign"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
