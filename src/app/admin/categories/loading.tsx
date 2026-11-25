import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-10 w-80" />
      <TableSkeleton rows={8} />
    </div>
  );
}
