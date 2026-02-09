import { Skeleton } from "@/components/ui/skeleton";

export default function DeveloperDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-64" />
    </div>
  );
}
