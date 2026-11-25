import { Skeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-12 w-full" />
      <TableSkeleton rows={10} />
    </div>
  );
}
