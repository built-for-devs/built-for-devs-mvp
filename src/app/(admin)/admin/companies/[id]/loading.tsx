import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
    </div>
  );
}
