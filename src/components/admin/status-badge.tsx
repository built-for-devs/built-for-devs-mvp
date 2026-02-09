import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/admin/filter-options";

const projectStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  matching: "bg-blue-100 text-blue-800",
  in_progress: "bg-blue-100 text-blue-800",
  evaluations_complete: "bg-purple-100 text-purple-800",
  report_drafting: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-700",
};

const evaluationStatusColors: Record<string, string> = {
  invited: "bg-blue-100 text-blue-800",
  accepted: "bg-blue-100 text-blue-800",
  declined: "bg-gray-100 text-gray-700",
  expired: "bg-gray-100 text-gray-700",
  recording: "bg-yellow-100 text-yellow-800",
  submitted: "bg-yellow-100 text-yellow-800",
  in_review: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
};

interface StatusBadgeProps {
  status: string;
  type: "project" | "evaluation";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const colors =
    type === "project" ? projectStatusColors : evaluationStatusColors;
  const colorClass = colors[status] ?? "bg-gray-100 text-gray-700";

  return (
    <Badge variant="outline" className={`${colorClass} border-transparent`}>
      {formatEnumLabel(status)}
    </Badge>
  );
}
