import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <TableSkeleton rows={7} />
    </div>
  );
}
