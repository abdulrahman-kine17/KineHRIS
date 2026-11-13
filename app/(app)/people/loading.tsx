import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading people">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <div className="mb-5 flex gap-2">
        <Skeleton className="h-10 w-72 rounded-card" />
        <Skeleton className="h-10 w-40 rounded-card" />
        <Skeleton className="h-10 w-40 rounded-card" />
      </div>
      <div className="rounded-card border border-line bg-surface">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex h-14 items-center gap-3 border-b border-line px-4 last:border-b-0">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="ml-auto h-3.5 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
