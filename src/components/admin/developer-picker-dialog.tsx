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

interface DeveloperPickerDialogProps {
  projectId: string;
  existingDeveloperIds: string[];
}

interface DeveloperRow {
  id: string;
  job_title: string | null;
  seniority: string | null;
  years_experience: number | null;
  languages: string[] | null;
  is_available: boolean | null;
  profiles: { full_name: string; email: string };
}

export function DeveloperPickerDialog({
  projectId,
  existingDeveloperIds,
}: DeveloperPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [developers, setDevelopers] = useState<DeveloperRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [payoutAmount, setPayoutAmount] = useState("149");
  const [error, setError] = useState<string | null>(null);
  const [assignedId, setAssignedId] = useState<string | null>(null);

  const fetchDevelopers = useCallback(
    async (query: string) => {
      setLoading(true);
      const supabase = createClient();
      let req = supabase
        .from("developers")
        .select(
          "id, job_title, seniority, years_experience, languages, is_available, profiles!inner(full_name, email, role)"
        )
        .neq("profiles.role", "admin")
        .eq("is_available", true)
        .limit(20);

      if (query.trim()) {
        req = req.ilike("profiles.full_name", `%${query.trim()}%`);
      }

      const { data } = await req;
      const filtered = (data ?? []).filter(
        (d) => !existingDeveloperIds.includes(d.id)
      ) as unknown as DeveloperRow[];
      setDevelopers(filtered);
      setLoading(false);
    },
    [existingDeveloperIds]
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchDevelopers(search), 300);
    return () => clearTimeout(timer);
  }, [search, open, fetchDevelopers]);

  function handleAssign(developerId: string) {
    setError(null);
    setAssignedId(developerId);
    startTransition(async () => {
      const result = await assignDeveloperToProject(
        projectId,
        developerId,
        parseFloat(payoutAmount) || 175
      );
      if (!result.success) {
        setError(result.error ?? "Failed to assign developer");
        setAssignedId(null);
        return;
      }
      setOpen(false);
      setSearch("");
      setAssignedId(null);
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        Assign Developer
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
            <DialogTitle>Assign Developer to Project</DialogTitle>
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
                  placeholder="Search developers by name..."
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
            ) : developers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search ? "No matching developers found." : "No available developers."}
              </p>
            ) : (
              <div className="max-h-[400px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Developer</TableHead>
                      <TableHead>Seniority</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Languages</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {developers.map((dev) => (
                      <TableRow key={dev.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {dev.profiles.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {dev.profiles.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {dev.seniority
                            ? dev.seniority.replace(/_/g, " ")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {dev.years_experience != null
                            ? `${dev.years_experience} yrs`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(dev.languages ?? []).slice(0, 3).map((lang) => (
                              <Badge
                                key={lang}
                                variant="secondary"
                                className="text-xs"
                              >
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleAssign(dev.id)}
                            disabled={isPending && assignedId === dev.id}
                          >
                            {isPending && assignedId === dev.id
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
