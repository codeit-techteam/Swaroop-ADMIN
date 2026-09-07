"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltipBox, ChartTooltipRow } from "@/components/shared/charts/chart-tooltip";
import { cn } from "@/lib/utils";

type RevenuePoint = {
  label: string;
  revenue: number;
  orders: number;
  gmv: number;
};

function formatLakh(value: number) {
  return `₹${value}L`;
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: RevenuePoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <ChartTooltipBox label={label === "Today" ? "Today" : `${label} · last 30 days`}>
      <ChartTooltipRow swatch="#2563EB" label="Revenue" value={formatLakh(point.revenue)} />
      <ChartTooltipRow label="Orders" value={point.orders.toLocaleString("en-IN")} />
      <ChartTooltipRow label="GMV" value={formatLakh(point.gmv)} />
    </ChartTooltipBox>
  );
}

export function RevenueGrowthChart({
  data,
  className,
}: {
  data: RevenuePoint[];
  className?: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const latest = data.at(-1);
  const first = data[0];
  const peak = data[0]
    ? data.reduce((best, point) => (point.revenue > best.revenue ? point : best), data[0])
    : undefined;
  const change = first && latest ? ((latest.revenue - first.revenue) / first.revenue) * 100 : 0;
  const up = change >= 0;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Latest revenue</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">
            {latest ? formatLakh(latest.revenue) : "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
              up
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {up ? "+" : ""}
            {change.toFixed(1)}% vs {first?.label}
          </span>
          {peak ? (
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
              Peak {formatLakh(peak.revenue)} · {peak.label}
            </span>
          ) : null}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`revenueFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563EB" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#2563EB" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 11 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748B", fontSize: 11 }}
              tickFormatter={formatLakh}
              width={46}
              domain={[0, 80]}
              ticks={[0, 20, 40, 60, 80]}
            />
            <Tooltip
              content={<RevenueTooltip />}
              cursor={{ stroke: "#2563EB", strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="#2563EB"
              strokeWidth={2.5}
              fill={`url(#revenueFill-${gradientId})`}
              dot={{ r: 3, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#2563EB", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">Hover any point to see revenue, orders, and GMV for that day.</p>
    </div>
  );
}
