import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed bg-slate-50 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-white border">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load this module",
  description = "Refresh the page or try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      action={
        onRetry ? (
          <button type="button" className="text-sm font-medium text-primary" onClick={onRetry}>
            Retry
          </button>
        ) : null
      }
    />
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-md border bg-white p-4">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function PageSkeleton({
  kpiCount = 4,
  tableRows = 6,
  showSearch = true,
}: {
  kpiCount?: number;
  tableRows?: number;
  showSearch?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-2 h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <KpiSkeleton count={kpiCount} />
      {showSearch ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-9 w-full max-w-md" />
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ) : null}
      <TableSkeleton rows={tableRows} />
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-md border bg-white p-4 shadow-soft", className)}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-48 w-full" />
      <div className="mt-3 flex gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4 rounded-md border bg-white p-4 md:p-6">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function DetailsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <div className="rounded-md border bg-white p-4 md:p-6">
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#F4F6F9]" aria-busy="true" aria-label="Loading PetroTrade OS">
      <aside className="hidden w-[260px] shrink-0 border-r bg-white p-4 lg:block">
        <Skeleton className="h-8 w-36" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-white px-4 md:px-6">
          <Skeleton className="h-8 w-48 max-w-[40%]" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-6">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <KpiSkeleton />
          <TableSkeleton rows={5} />
        </main>
      </div>
    </div>
  );
}
