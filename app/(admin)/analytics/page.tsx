"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard } from "@/components/shared/chart-card";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { buyerGrowth, categoryDistribution, regionalDistribution, revenueSeries } from "@/lib/mock-data";

const RANGES = ["7 Days", "30 Days", "90 Days", "12 Months"] as const;
const COLORS = ["#1D4ED8", "#0F766E", "#D97706", "#7C3AED", "#DC2626"];

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
        <ChartCard title="Revenue Growth">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#2563EB" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Order Volume">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries}>
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="orders" fill="#1D4ED8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="GMV">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries}>
                <XAxis dataKey="label" fontSize={11} />
                <Tooltip />
                <Bar dataKey="gmv" fill="#0F766E" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Buyer / Seller Growth">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={buyerGrowth}>
                <XAxis dataKey="label" fontSize={11} />
                <Tooltip />
                <Line dataKey="buyers" stroke="#2563EB" />
                <Line dataKey="sellers" stroke="#0F766E" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Category Distribution">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryDistribution} dataKey="value" nameKey="name" outerRadius={80}>
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Regional Distribution">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={regionalDistribution} dataKey="value" nameKey="name" outerRadius={80}>
                  {regionalDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
