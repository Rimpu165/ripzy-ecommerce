import { ProductGridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="container-page space-y-6 py-8" aria-busy="true">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Skeleton className="hidden h-96 lg:block" />
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  );
}
