"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/shared/chart-card";
import { ChartTooltipBox, ChartTooltipRow } from "@/components/shared/charts/chart-tooltip";
import { RevenueGrowthChart } from "@/components/shared/charts/revenue-growth-chart";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { buyerGrowth, categoryDistribution, regionalDistribution, revenueSeries } from "@/lib/mock-data";
import { downloadCsv } from "@/lib/csv";

const RANGES = ["7 Days", "30 Days", "90 Days", "12 Months"] as const;
const COLORS = ["#1D4ED8", "#0F766E", "#D97706", "#7C3AED", "#DC2626"];
const categorySlices = categoryDistribution.map((item, index) => ({
  ...item,
  color: COLORS[index % COLORS.length],
}));
const regionalSlices = regionalDistribution.map((item, index) => ({
  ...item,
  color: COLORS[index % COLORS.length],
}));

function formatLakh(value: number) {
  return `₹${value}L`;
}

function SimpleTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; payload?: Record<string, unknown> }>;
  label?: string;
  valueFormatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipBox label={label}>
      {payload.map((item) => (
        <ChartTooltipRow
          key={item.name}
          swatch={item.color}
          label={item.name}
          value={valueFormatter ? valueFormatter(item.value, item.name) : String(item.value)}
        />
      ))}
    </ChartTooltipBox>
  );
}

function ShareLegend({
  items,
  colors,
}: {
  items: Array<{ name: string; value: number }>;
  colors: string[];
}) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2">
      {items.map((item, index) => (
        <li key={item.name} className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            {item.name}
          </span>
          <span className="tabular-nums text-muted-foreground">{item.value}%</span>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("30 Days");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        description={`Enterprise marketplace performance · ${range}`}
        actions={
          <>
            {RANGES.map((item) => (
              <Button key={item} size="sm" variant={range === item ? "default" : "outline"} onClick={() => setRange(item)}>
                {item}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv("analytics.csv", [
                  { metric: "GMV", value: 182000000 },
                  { metric: "Revenue", value: 142000000 },
                  { metric: "Orders", value: 8920 },
                  { metric: "AOV", value: 159000 },
                ])
              }
            >
              Export reports
            </Button>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="GMV" value="₹18.2 Cr" />
        <KpiCard label="Revenue" value="₹14.2 Cr" />
        <KpiCard label="Orders" value="8,920" href="/orders" />
        <KpiCard label="Avg Order Value" value="₹1.59L" />
        <KpiCard label="Buyers" value="1,284" href="/customers" />
        <KpiCard label="Sellers" value="452" href="/sellers" />
        <KpiCard label="Repeat Buyers" value="61%" />
        <KpiCard label="Seller Performance" value="89 idx" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Revenue Growth" description="Daily revenue in ₹ lakh · last 30 days">
          <RevenueGrowthChart data={revenueSeries} />
        </ChartCard>
        <ChartCard title="Order Volume" description="Orders placed across the same period">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={{ stroke: "#E2E8F0" }} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} width={36} />
                <Tooltip
                  cursor={{ fill: "rgb(37 99 235 / 0.06)" }}
                  content={<SimpleTooltip valueFormatter={(value) => value.toLocaleString("en-IN")} />}
                />
                <Bar dataKey="orders" name="Orders" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="GMV" description="Gross merchandise value in ₹ lakh">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={{ stroke: "#E2E8F0" }} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} tickFormatter={formatLakh} width={46} />
                <Tooltip
                  cursor={{ fill: "rgb(15 118 110 / 0.06)" }}
                  content={<SimpleTooltip valueFormatter={(value) => formatLakh(value)} />}
                />
                <Bar dataKey="gmv" name="GMV" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Buyer / Seller Growth" description="Active marketplace participants by month">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buyerGrowth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={{ stroke: "#E2E8F0" }} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} width={40} />
                <Tooltip content={<SimpleTooltip valueFormatter={(value) => value.toLocaleString("en-IN")} />} />
                <Line type="monotone" dataKey="buyers" name="Buyers" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="sellers" name="Sellers" stroke="#0F766E" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#2563EB]" /> Buyers</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#0F766E]" /> Sellers</span>
          </div>
        </ChartCard>
        <ChartCard title="Category Distribution" description="Share of GMV by product category">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categorySlices} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                  {categorySlices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<SimpleTooltip valueFormatter={(value) => `${value}%`} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ShareLegend items={categorySlices} colors={COLORS} />
        </ChartCard>
        <ChartCard title="Regional Distribution" description="Share of GMV by region">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={regionalSlices} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                  {regionalSlices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<SimpleTooltip valueFormatter={(value) => `${value}%`} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ShareLegend items={regionalSlices} colors={COLORS} />
        </ChartCard>
      </div>
    </div>
  );
}
