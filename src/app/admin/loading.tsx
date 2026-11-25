import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80 max-w-full" /></div>
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-28" />)}</div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2"><Skeleton className="h-80" /><Skeleton className="h-52" /></div>
        <div className="space-y-6"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
