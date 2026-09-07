"use client";

import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltipBox, ChartTooltipRow } from "@/components/shared/charts/chart-tooltip";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";

type RiskSlice = {
  name: string;
  label: string;
  value: number;
  amount: number;
  color: string;
  hint: string;
};

function RiskTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RiskSlice }>;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0]?.payload;
  if (!slice) return null;
  return (
    <ChartTooltipBox label={slice.label}>
      <ChartTooltipRow swatch={slice.color} label="Share" value={`${slice.value}%`} />
      <ChartTooltipRow label="Exposure" value={formatInr(slice.amount)} />
      <p className="pt-1 text-[11px] text-muted-foreground">{slice.hint}</p>
    </ChartTooltipBox>
  );
}

export function CreditRiskChart({ data }: { data: RiskSlice[] }) {
  const [activeName, setActiveName] = useState<string | null>(null);
  const total = useMemo(() => data.reduce((sum, item) => sum + item.amount, 0), [data]);
  const majority = data[0]
    ? data.reduce((best, item) => (item.value > best.value ? item : best), data[0])
    : undefined;
  const high = data.find((item) => item.name === "High");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative mx-auto size-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={3}
                stroke="#fff"
                strokeWidth={2}
                onMouseEnter={(_, index) => setActiveName(data[index]?.name ?? null)}
                onMouseLeave={() => setActiveName(null)}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    fillOpacity={activeName && activeName !== entry.name ? 0.35 : 1}
                    style={{ cursor: "pointer", outline: "none" }}
                  />
                ))}
              </Pie>
              <Tooltip content={<RiskTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[11px] text-muted-foreground">Total</p>
            <p className="text-lg font-semibold tabular-nums leading-tight">{formatInr(total)}</p>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {data.map((item) => (
            <li key={item.name}>
              <button
                type="button"
                onMouseEnter={() => setActiveName(item.name)}
                onMouseLeave={() => setActiveName(null)}
                onFocus={() => setActiveName(item.name)}
                onBlur={() => setActiveName(null)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left transition",
                  activeName === item.name
                    ? "border-slate-300 bg-slate-50"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-tight">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{item.hint}</span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums">{item.value}%</span>
                  <span className="block text-[11px] tabular-nums text-muted-foreground">
                    {formatInr(item.amount)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {majority ? (
          <>
            <span className="font-semibold text-slate-800">{majority.value}% is {majority.label.toLowerCase()}</span>
            {high ? ` · ${formatInr(high.amount)} high-risk exposure needs monitoring.` : null}
          </>
        ) : null}
      </p>
    </div>
  );
}
