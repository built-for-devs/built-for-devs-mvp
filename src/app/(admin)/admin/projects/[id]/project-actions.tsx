"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  updateProjectStatus,
  updateProjectNotes,
  saveFindings,
  publishFindings,
  reviewEvaluation,
  logPayment,
  removeEvaluation,
} from "@/lib/admin/actions";
import { projectStatusOptions, formatEnumLabel } from "@/lib/admin/filter-options";
import { NotesEditor } from "@/components/admin/notes-editor";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeveloperPickerDialog } from "@/components/admin/developer-picker-dialog";
import type { ProjectWithCompany, EvaluationWithRelations } from "@/types/admin";
import type { Enums } from "@/types/database";

interface ProjectActionsProps {
  project: ProjectWithCompany;
  evaluations: EvaluationWithRelations[];
  approvedEvals: EvaluationWithRelations[];
  paidEvals: EvaluationWithRelations[];
}

export function ProjectActions({
  project,
  evaluations,
  approvedEvals,
  paidEvals,
}: ProjectActionsProps) {
  const [isPending, startTransition] = useTransition();

  // Status change
  const [statusConfirm, setStatusConfirm] = useState<{
    open: boolean;
    status: string;
  }>({ open: false, status: "" });

  function handleStatusChange(newStatus: string) {
    setStatusConfirm({ open: true, status: newStatus });
  }

  function confirmStatusChange() {
    startTransition(async () => {
      await updateProjectStatus(
        project.id,
        statusConfirm.status as Enums<"project_status">
      );
      setStatusConfirm({ open: false, status: "" });
    });
  }

  // Review dialog
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    evalId: string;
  }>({ open: false, evalId: "" });
  const [reviewScore, setReviewScore] = useState("3.00");
  const [reviewNotes, setReviewNotes] = useState("");

  function handleReview(approved: boolean) {
    startTransition(async () => {
      await reviewEvaluation(
        reviewDialog.evalId,
        parseFloat(reviewScore),
        reviewNotes,
        approved
      );
      setReviewDialog({ open: false, evalId: "" });
      setReviewScore("3.00");
      setReviewNotes("");
    });
  }

  // Payment dialog
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    evalId: string;
  }>({ open: false, evalId: "" });
  const [payoutRef, setPayoutRef] = useState("");

  function handleLogPayment() {
    startTransition(async () => {
      await logPayment(paymentDialog.evalId, payoutRef);
      setPaymentDialog({ open: false, evalId: "" });
      setPayoutRef("");
    });
  }

  // Findings report
  const [report, setReport] = useState(project.findings_report ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);

  return (
    <>
      {/* ===== STATUS & NOTES ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status & Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Status</Label>
            <Select
              value={project.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projectStatusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatEnumLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Admin Notes</Label>
            <div className="mt-1">
              <NotesEditor
                initialValue={project.admin_notes}
                onSave={(notes) => updateProjectNotes(project.id, notes)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== EVALUATIONS ===== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Evaluations ({evaluations.length}/{project.num_evaluations})
          </CardTitle>
          <DeveloperPickerDialog
            projectId={project.id}
            existingDeveloperIds={evaluations.map((e) => e.developers.id)}
          />
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No developers assigned yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Developer</TableHead>
                  <TableHead>Anonymous Descriptor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <Link
                        href={`/admin/developers/${ev.developers.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {ev.developers.profiles.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ev.anonymous_descriptor ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ev.status} type="evaluation" />
                    </TableCell>
                    <TableCell className="text-sm">
                      {ev.admin_quality_score?.toFixed(2) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {ev.status === "submitted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setReviewDialog({ open: true, evalId: ev.id })
                            }
                          >
                            Review
                          </Button>
                        )}
                        {ev.status === "invited" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              startTransition(async () => {
                                await removeEvaluation(ev.id, project.id);
                              });
                            }}
                            disabled={isPending}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ===== FINDINGS REPORT ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Findings Report
            {project.report_published && (
              <span className="ml-2 text-xs font-normal text-green-600">
                Published{" "}
                {project.report_published_at
                  ? new Date(project.report_published_at).toLocaleDateString()
                  : ""}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? "Edit" : "Preview"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                startTransition(async () => {
                  await saveFindings(project.id, report);
                });
              }}
              disabled={isPending}
            >
              Save Draft
            </Button>
            {!project.report_published && (
              <Button
                size="sm"
                variant="default"
                onClick={() => setPublishConfirm(true)}
              >
                Publish
              </Button>
            )}
          </div>

          {showPreview ? (
            <div className="prose prose-sm max-w-none rounded-md border p-4">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          ) : (
            <Textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Write findings report in markdown..."
              rows={12}
            />
          )}
        </CardContent>
      </Card>

      {/* ===== PAYMENT TRACKING ===== */}
      {approvedEvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Developer</TableHead>
                  <TableHead>PayPal Email</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedEvals.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="text-sm font-medium">
                      {ev.developers.profiles.full_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ev.developers.paypal_email ?? (
                        <span className="text-muted-foreground">Not provided</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">${ev.payout_amount ?? 0}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPaymentDialog({ open: true, evalId: ev.id })
                        }
                      >
                        Log Payment
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment history */}
      {paidEvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Developer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidEvals.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="text-sm font-medium">
                      {ev.developers.profiles.full_name}
                    </TableCell>
                    <TableCell className="text-sm">${ev.payout_amount ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ev.payout_reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ev.paid_at ? new Date(ev.paid_at).toLocaleDateString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ===== DIALOGS ===== */}

      {/* Status change confirmation */}
      <ConfirmDialog
        open={statusConfirm.open}
        onOpenChange={(open) =>
          setStatusConfirm((s) => ({ ...s, open }))
        }
        title="Change Project Status"
        description={`Change status to "${formatEnumLabel(statusConfirm.status)}"?`}
        confirmLabel="Change Status"
        onConfirm={confirmStatusChange}
        loading={isPending}
      />

      {/* Review dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) =>
          setReviewDialog((s) => ({ ...s, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Evaluation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quality Score (1.00 - 5.00)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                step="0.01"
                value={reviewScore}
                onChange={(e) => setReviewScore(e.target.value)}
              />
            </div>
            <div>
              <Label>Review Notes</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Notes about this evaluation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => handleReview(false)}
              disabled={isPending}
            >
              Reject
            </Button>
            <Button onClick={() => handleReview(true)} disabled={isPending}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog
        open={paymentDialog.open}
        onOpenChange={(open) =>
          setPaymentDialog((s) => ({ ...s, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Payment</DialogTitle>
          </DialogHeader>
          <div>
            <Label>PayPal Transaction ID / Reference</Label>
            <Input
              value={payoutRef}
              onChange={(e) => setPayoutRef(e.target.value)}
              placeholder="e.g., 5TY123456789"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialog({ open: false, evalId: "" })}
            >
              Cancel
            </Button>
            <Button onClick={handleLogPayment} disabled={isPending || !payoutRef}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish confirmation */}
      <ConfirmDialog
        open={publishConfirm}
        onOpenChange={setPublishConfirm}
        title="Publish Findings Report"
        description="This will make the report visible to the company. Make sure it's ready."
        confirmLabel="Publish"
        onConfirm={() => {
          startTransition(async () => {
            await publishFindings(project.id);
            setPublishConfirm(false);
          });
        }}
        loading={isPending}
      />
    </>
  );
}
