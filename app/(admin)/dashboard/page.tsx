"use client";

import {
  AlertTriangle,
  Building2,
  Factory,
  RefreshCw,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { ChartCard } from "@/components/shared/chart-card";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { greetingForNow } from "@/lib/format";
import {
  ecosystemOverview,
  platformHealth,
  revenueSeries,
} from "@/lib/mock-data";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import { useProcurementStore } from "@/store/procurement-store";

const RANGES = ["7 Days", "30 Days", "90 Days"] as const;
const PIE = [
  { name: "Low Risk", value: 75, color: "#059669" },
  { name: "Medium Risk", value: 15, color: "#D97706" },
  { name: "High Risk", value: 10, color: "#DC2626" },
];

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const orders = useDataStore((s) => s.orders);
  const procurement = useProcurementStore((s) => s.procurements);
  const kyc = useDataStore((s) => s.kyc);
  const payments = useDataStore((s) => s.payments);
  const disputes = useDataStore((s) => s.disputes);
  const shipments = useDataStore((s) => s.shipments);
  const [range, setRange] = useState<(typeof RANGES)[number]>("30 Days");
  const [tick, setTick] = useState(0);

  const pendingKyc = kyc.filter((item) => item.status === "Pending" || item.status === "Under Review").length;
  const pendingPayments = payments.filter((item) => item.status === "Pending" || item.status === "Processing").length;
  const delayed = shipments.filter((item) => item.status === "Delayed").length;
  const openDisputes = disputes.filter((item) => item.status !== "Resolved" && item.status !== "Rejected").length;

  const activity = [
    { id: "a1", title: "Order #PT-9021 Placed", detail: "PP RAFFIA · Apex Polymers", time: "2026-09-05T07:18:00+05:30", source: "Customer Web" as const },
    { id: "a2", title: "KYC Approved", detail: "Apex Polymers company pack", time: "2026-09-04T18:10:00+05:30", source: "Admin Portal" as const },
    { id: "a3", title: "Payment Verified", detail: "PAY-55101 RTGS", time: "2026-09-05T07:42:00+05:30", source: "Admin Portal" as const },
    { id: "a4", title: "Dispatch Update", detail: "SHP-4401 in transit", time: "2026-09-05T06:55:00+05:30", source: "Seller App" as const },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Admin Dashboard"
        description={`${APP_SUB} · ${range} view`}
        breadcrumbs={[{ label: "PetroTrade OS" }, { label: "Dashboard" }]}
        actions={
          <>
            {RANGES.map((item) => (
              <Button key={item} type="button" size="sm" variant={range === item ? "default" : "outline"} onClick={() => setRange(item)}>
                {item}
              </Button>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => { setTick((n) => n + 1); toast.success("Dashboard refreshed"); }}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                downloadCsv("dashboard-kpis.csv", [
                  { metric: "Buyers", value: 1284 },
                  { metric: "Sellers", value: 452 },
                  { metric: "Orders", value: 8920 },
                  { metric: "Revenue", value: 142000000 },
                ])
              }
            >
              Export
            </Button>
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        {greetingForNow()}, {user?.name ?? "Admin"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Buyers" value="1,284" icon={Building2} href="/customers" />
        <KpiCard label="Total Sellers" value="452" icon={Factory} href="/sellers" />
        <KpiCard label="Total Orders" value="8,920" icon={ShoppingCart} href="/orders" />
        <KpiCard label="Total Revenue" value="₹14.2 Cr" icon={Wallet} href="/analytics" />
      </div>
      <section className="rounded-md border bg-white p-4 shadow-soft">
        <p className="section-label mb-3">Operations Oversight</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Pending KYC" value={String(pendingKyc)} href="/kyc" tone="warning" />
          <KpiCard label="Pending Payments" value={String(pendingPayments)} href="/payments" tone="warning" />
          <KpiCard label="Pending Dispatch" value="8" href="/logistics" tone="warning" />
          <KpiCard label="Open Disputes" value={String(openDisputes)} href="/disputes" tone="danger" />
          <KpiCard label="Delayed Deliveries" value={String(delayed)} href="/logistics" tone="danger" />
        </div>
      </section>
      <section className="rounded-md border bg-white p-4 shadow-soft">
        <p className="section-label mb-3">Ecosystem Overview</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ecosystemOverview.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => router.push(item.href)}
              className="rounded-md border p-3 text-left hover:border-primary/40"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{item.name}</p>
                <StatusBadge value={item.status} />
              </div>
              <p className="mt-3 text-xl font-semibold">{item.metric.toLocaleString("en-IN")}</p>
              <p className="text-xs text-muted-foreground">{item.metricLabel}</p>
              <p className="mt-2 text-xs">
                {item.secondaryLabel}: <span className="font-medium">{item.secondary}</span>
              </p>
            </button>
          ))}
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Credit Exposure">
          <div className="grid gap-3">
            <div className="flex justify-between text-sm"><span>Credit Outstanding</span><span className="font-semibold">₹2.4 Cr</span></div>
            <div className="flex justify-between text-sm"><span>Collection Due</span><span className="font-semibold">₹85L</span></div>
            <div className="flex justify-between text-sm text-red-700"><span>Overdue Amount</span><span className="font-semibold">₹12L</span></div>
          </div>
        </ChartCard>
        <ChartCard title="Verified Payments">
          <p className="text-3xl font-semibold">₹1.8 Cr</p>
          <p className="mt-1 text-sm text-muted-foreground">Processed Today</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={() => router.push("/payments")}>
            Open payments
          </Button>
        </ChartCard>
        <ChartCard title="Credit Risk Exposure">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PIE} dataKey="value" nameKey="name" innerRadius={38} outerRadius={58}>
                  {PIE.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs">
            <span>Low 75%</span>
            <span>Medium 15%</span>
            <span>High 10%</span>
          </div>
        </ChartCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard title="Revenue Growth" className="xl:col-span-2">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="#DBEAFE" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Activity Feed">
          <ActivityTimeline key={tick} items={activity} />
        </ChartCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Recent Orders">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Order</th>
                  <th>Buyer</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="cursor-pointer border-t" onClick={() => router.push(`/orders?id=${order.id}`)}>
                    <td className="py-2 font-medium">{order.id}</td>
                    <td>{order.buyer}</td>
                    <td><StatusBadge value={order.status} /></td>
                    <td><SourceBadge source={order.source} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
        <ChartCard title="Pending Procurement Tasks">
          <ul className="space-y-2">
            {procurement
              .filter((item) => !["Approved", "Completed", "Cancelled", "Rejected"].includes(item.status))
              .slice(0, 5)
              .map((item) => (
              <li key={item.id}>
                <Link href={`/procurement?id=${item.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
                  <span>
                    <span className="font-medium">{item.id}</span>
                    <span className="ml-2 text-muted-foreground">{item.commodity}</span>
                  </span>
                  <StatusBadge value={item.status} />
                </Link>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Critical Alerts">
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 size-4" />
            Delayed Brent parcel SHP-4370 is holding a ₹2.4 Cr order in dispute.
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-4" />
            {pendingKyc} KYC packs still require reviewer action.
          </div>
        </ChartCard>
        <ChartCard title="Platform Health">
          <div className="grid grid-cols-2 gap-2">
            {platformHealth.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{item.name}</span>
                <StatusBadge value={item.status} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

const APP_SUB = "PetroTrade OS";
