import type { Classification } from "./types";

export const classificationStyles: Record<Classification, string> = {
  exceptional: "bg-emerald-100 text-emerald-800 border-emerald-200",
  excellent: "bg-green-100 text-green-800 border-green-200",
  good: "bg-blue-100 text-blue-800 border-blue-200",
  needs_work: "bg-amber-100 text-amber-800 border-amber-200",
  poor: "bg-red-100 text-red-800 border-red-200",
};

export const classificationLabels: Record<Classification, string> = {
  exceptional: "Exceptional",
  excellent: "Excellent",
  good: "Good",
  needs_work: "Needs Work",
  poor: "Poor",
};
