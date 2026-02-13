import type { Classification } from "./types";

export const classificationStyles: Record<Classification, string> = {
  exceptional: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  excellent: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  good: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  needs_work: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  poor: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

export const classificationLabels: Record<Classification, string> = {
  exceptional: "Exceptional",
  excellent: "Excellent",
  good: "Good",
  needs_work: "Needs Work",
  poor: "Poor",
};
