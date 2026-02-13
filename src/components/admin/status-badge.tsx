import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/admin/filter-options";

const projectStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending_payment: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  matching: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  evaluations_complete: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  report_drafting: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const evaluationStatusColors: Record<string, string> = {
  invited: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  declined: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  recording: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  submitted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

interface StatusBadgeProps {
  status: string;
  type: "project" | "evaluation";
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const colors =
    type === "project" ? projectStatusColors : evaluationStatusColors;
  const colorClass = colors[status] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <Badge variant="outline" className={`${colorClass} border-transparent`}>
      {formatEnumLabel(status)}
    </Badge>
  );
}
