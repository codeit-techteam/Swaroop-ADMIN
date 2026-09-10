import { TableSkeleton } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";

export function GradeSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
      <TableSkeleton rows={8} />
    </div>
  );
}
