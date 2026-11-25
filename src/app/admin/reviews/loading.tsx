import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-8 w-80" />
      <TableSkeleton rows={8} />
    </div>
  );
}
