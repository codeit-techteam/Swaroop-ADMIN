"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/shared/chart-card";
import { ChartTooltipBox, ChartTooltipRow } from "@/components/shared/charts/chart-tooltip";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, KpiSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { formatInrExact } from "@/lib/format";
import { getAdminReportsOverview, getAdminSalesReport } from "@/lib/api/ops";

type Overview = Awaited<ReturnType<typeof getAdminReportsOverview>>;
type Sales = Awaited<ReturnType<typeof getAdminSalesReport>>;

function SimpleTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipBox label={label}>
      {payload.map((item) => (
        <ChartTooltipRow key={item.name} swatch={item.color} label={item.name} value={String(item.value)} />
      ))}
    </ChartTooltipBox>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [sales, setSales] = useState<Sales | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextOverview, nextSales] = await Promise.all([getAdminReportsOverview(), getAdminSalesReport()]);
      setOverview(nextOverview);
      setSales(nextSales);
    } catch (cause) {
      setOverview(null);
      setSales(null);
      setError(cause instanceof Error ? cause.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Analytics" description="Live marketplace reports from PostgreSQL." />
        <KpiSkeleton />
      </div>
    );
  }

  if (error || !overview || !sales) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Analytics" description="Live marketplace reports from PostgreSQL." />
        <ErrorState title="Unable to load analytics." description={error ?? undefined} onRetry={() => void load()} />
      </div>
    );
  }

  const chart = sales.byStatus.map((row) => ({
    label: row.status,
    orders: row.count,
    amount: Number(row.totalAmount) || 0,
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        description="Enterprise marketplace performance from Swaroop-Backend reports."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv("analytics.csv", [
                { metric: "Users", value: overview.users },
                { metric: "Customers", value: overview.customers },
                { metric: "Sellers", value: overview.sellers },
                { metric: "Purchase requests", value: overview.purchaseRequests },
                { metric: "Purchase orders", value: overview.purchaseOrders },
                { metric: "Payments", value: overview.payments },
                { metric: "Offers", value: overview.offers },
                { metric: "Shipments", value: overview.shipments },
                { metric: "Order value", value: sales.totalAmount },
              ])
            }
          >
            Export reports
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Customers" value={String(overview.customers)} href="/customers" />
        <KpiCard label="Sellers" value={String(overview.sellers)} href="/sellers" />
        <KpiCard label="Orders" value={String(overview.purchaseOrders)} href="/orders" />
        <KpiCard label="Order value" value={formatInrExact(Number(sales.totalAmount) || 0)} />
        <KpiCard label="Purchase requests" value={String(overview.purchaseRequests)} href="/procurement" />
        <KpiCard label="Payments" value={String(overview.payments)} href="/payments" />
        <KpiCard label="Offers" value={String(overview.offers)} href="/offers" />
        <KpiCard label="Shipments" value={String(overview.shipments)} href="/logistics" />
      </div>
      <ChartCard title="Orders by status" description="Live purchase-order counts from PostgreSQL">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={{ stroke: "#E2E8F0" }} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748B", fontSize: 11 }} width={36} />
              <Tooltip cursor={{ fill: "rgb(37 99 235 / 0.06)" }} content={<SimpleTooltip />} />
              <Bar dataKey="orders" name="Orders" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
