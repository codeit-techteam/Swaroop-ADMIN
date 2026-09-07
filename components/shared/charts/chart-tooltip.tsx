import type { ReactNode } from "react";

export function ChartTooltipBox({
  label,
  children,
}: {
  label?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5 shadow-card">
      {label ? (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function ChartTooltipRow({
  swatch,
  label,
  value,
}: {
  swatch?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {swatch ? (
          <span className="size-2 rounded-full" style={{ backgroundColor: swatch }} />
        ) : null}
        {label}
      </span>
      <span className="font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}
