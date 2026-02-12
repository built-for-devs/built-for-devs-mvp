"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { CheckCircle, Search, XCircle } from "lucide-react";

interface ProjectRow {
  id: string;
  product_name: string;
  status: string;
  num_evaluations: number;
  companies: { name: string } | null;
  evaluation_count: number;
}

interface AssignResult {
  developerId: string;
  name: string;
  success: boolean;
  error?: string;
}

interface BulkProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developerIds: string[];
  developerNames: Record<string, string>;
  onComplete: () => void;
}

export function BulkProjectDialog({
  open,
  onOpenChange,
  developerIds,
  developerNames,
  onComplete,
}: BulkProjectDialogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [payoutAmount, setPayoutAmount] = useState("149");
  const [results, setResults] = useState<AssignResult[] | null>(null);
  const [assigningProjectId, setAssigningProjectId] = useState<string | null>(null);

  const fetchProjects = useCallback(async (query: string) => {
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
    }>).map((p) => ({
      id: p.id,
      product_name: p.product_name,
      status: p.status,
      num_evaluations: p.num_evaluations,
      companies: p.companies,
      evaluation_count: p.evaluations?.[0]?.count ?? 0,
    }));

    setProjects(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchProjects(search), 300);
    return () => clearTimeout(timer);
  }, [search, open, fetchProjects]);

  function handleAssign(projectId: string) {
    setAssigningProjectId(projectId);
    startTransition(async () => {
      const assignResults: AssignResult[] = [];

      for (const devId of developerIds) {
        const result = await assignDeveloperToProject(
          projectId,
          devId,
          parseFloat(payoutAmount) || 149
        );
        assignResults.push({
          developerId: devId,
          name: developerNames[devId] ?? devId,
          success: result.success,
          error: result.error,
        });
      }

      setResults(assignResults);
      setAssigningProjectId(null);
      router.refresh();
    });
  }

  function handleClose() {
    onOpenChange(false);
    if (results?.some((r) => r.success)) {
      onComplete();
    }
    setSearch("");
    setResults(null);
    setAssigningProjectId(null);
  }

  const statusColors: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    matching: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
  };

  const successCount = results?.filter((r) => r.success).length ?? 0;
  const failCount = results?.filter((r) => !r.success).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Add {developerIds.length} Developer{developerIds.length !== 1 ? "s" : ""} to Project
          </DialogTitle>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4">
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
                <Label htmlFor="bulk-payout" className="whitespace-nowrap text-sm">
                  Payout $
                </Label>
                <Input
                  id="bulk-payout"
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
                            disabled={isPending}
                          >
                            {isPending && assigningProjectId === proj.id
                              ? "Assigning..."
                              : `Assign ${developerIds.length}`}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 text-sm">
              {successCount > 0 && (
                <span className="flex items-center gap-1 text-green-700">
                  <CheckCircle className="h-4 w-4" /> {successCount} assigned
                </span>
              )}
              {failCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" /> {failCount} failed
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-auto space-y-1">
              {results.map((r) => (
                <div
                  key={r.developerId}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{r.name}</span>
                  {r.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-xs text-red-600">{r.error}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-start">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
