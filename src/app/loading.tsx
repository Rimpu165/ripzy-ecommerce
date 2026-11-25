import { ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page space-y-6 py-8" aria-busy="true">
      <Skeleton className="h-56 w-full rounded-2xl sm:h-72" />
      <Skeleton className="h-8 w-56" />
      <ProductGridSkeleton count={4} />
    </div>
  );
}
