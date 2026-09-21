"use client";

import {
  AlertTriangle,
  Boxes,
  Layers3,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { CmsOverview } from "@/components/content/cms-overview";
import { ChartCard } from "@/components/shared/chart-card";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { SourceBadge } from "@/components/shared/source-badge";
import { ChartSkeleton, KpiSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { formatInr, greetingForNow } from "@/lib/format";
import { getGrades } from "@/lib/api/grades";
import { listAdminProducts } from "@/lib/api/products";
import { getCreditSummary } from "@/lib/api/credit";
import { listAdminKyc, listAdminPayments, listAdminShipments } from "@/lib/api/ops";
import { displayMoney } from "@/lib/credit-format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import { useProcurementStore } from "@/store/procurement-store";

const RANGES = ["7 Days", "30 Days", "90 Days"] as const;

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
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [creditLoading, setCreditLoading] = useState(true);
  const [catalogStats, setCatalogStats] = useState({
    grades: 0,
    activeGrades: 0,
    products: 0,
    activeProducts: 0,
  });
  const [creditStats, setCreditStats] = useState<{
    pendingApplications: string;
    approvedAccounts: string;
    outstanding: string;
    overdue: string;
    error: string | null;
  }>({
    pendingApplications: "—",
    approvedAccounts: "—",
    outstanding: "—",
    overdue: "—",
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCreditLoading(true);
    void Promise.all([getGrades(), listAdminProducts()])
      .then(([grades, products]) => {
        if (cancelled) return;
        setCatalogStats({
          grades: grades.length,
          activeGrades: grades.filter((item) => item.status === "ACTIVE").length,
          products: products.length,
          activeProducts: products.filter((item) => item.status === "Active").length,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogStats({ grades: 0, activeGrades: 0, products: 0, activeProducts: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    void Promise.all([listAdminKyc(), listAdminPayments(), listAdminShipments()])
      .then(([kycRows, paymentRows, shipmentRows]) => {
        if (cancelled) return;
        useDataStore.setState({
          kyc: kycRows,
          payments: paymentRows,
          shipments: shipmentRows,
        });
      })
      .catch(() => {
        if (!cancelled) {
          useDataStore.setState({ kyc: [], payments: [], shipments: [] });
        }
      });
    void getCreditSummary()
      .then((summary) => {
        if (cancelled) return;
        setCreditStats({
          pendingApplications: String(summary.pendingApplications),
          approvedAccounts: String(summary.approvedAccounts),
          outstanding: displayMoney(summary.outstandingAmount),
          overdue: displayMoney(summary.overdueAmount),
          error: null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setCreditStats({
            pendingApplications: "—",
            approvedAccounts: "—",
            outstanding: "—",
            overdue: "—",
            error: "Credit API not available",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setCreditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const pendingKyc = kyc.filter((item) => item.status === "Pending" || item.status === "Under Review").length;
  const pendingPayments = payments.filter((item) => item.status === "Pending" || item.status === "Processing").length;
  const delayedShipments = shipments.filter((item) => item.status === "Delayed");
  const delayed = delayedShipments.length;
  const pendingDispatch = delayed;
  const openDisputes = disputes.filter((item) => item.status !== "Resolved" && item.status !== "Rejected");
  const criticalDisputes = openDisputes.filter((item) => item.priority === "Critical");

  const criticalAlerts = [
    ...delayedShipments.map((item) => ({
      id: item.id,
      tone: "critical" as const,
      href: "/logistics",
      message: `Delayed ${item.grade} parcel ${item.id} is holding order ${item.orderId}.`,
    })),
    ...criticalDisputes.map((item) => ({
      id: item.id,
      tone: "critical" as const,
      href: "/disputes",
      message: `Critical dispute ${item.id} on ${item.orderId} — ${formatInr(item.amount)} (${item.customer}).`,
    })),
    ...(pendingKyc
      ? [
          {
            id: "kyc",
            tone: "warning" as const,
            href: "/kyc",
            message: `${pendingKyc} KYC packs still require reviewer action.`,
          },
        ]
      : []),
    ...(pendingPayments
      ? [
          {
            id: "payments",
            tone: "warning" as const,
            href: "/payments",
            message: `${pendingPayments} payments are pending or processing.`,
          },
        ]
      : []),
  ];

  const activity = [
    {
      id: "catalog",
      title: "Grade Master connected",
      detail: catalogLoading
        ? "Loading catalog stats…"
        : `${catalogStats.activeGrades} active grades · ${catalogStats.activeProducts} active products`,
      time: new Date().toISOString(),
      source: "Admin Portal" as const,
    },
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
              disabled={catalogLoading}
              onClick={() =>
                downloadCsv("dashboard-kpis.csv", [
                  { metric: "Grades", value: catalogStats.grades },
                  { metric: "Active grades", value: catalogStats.activeGrades },
                  { metric: "Products", value: catalogStats.products },
                  { metric: "Active products", value: catalogStats.activeProducts },
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
      <section className="rounded-md border border-red-200 bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-red-700" />
            <p className="section-label !text-red-700">Critical Alerts</p>
          </div>
          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            {criticalAlerts.length} requiring action
          </span>
        </div>
        {criticalAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No critical alerts right now.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {criticalAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                onClick={() => router.push(alert.href)}
                className={cn(
                  "flex items-start gap-2 rounded-md border p-3 text-left text-sm transition hover:shadow-soft",
                  alert.tone === "critical"
                    ? "border-red-200 bg-red-50 text-red-800 hover:border-red-300"
                    : "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300",
                )}
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{alert.message}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      {catalogLoading ? (
        <KpiSkeleton />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Grade Master" value={String(catalogStats.grades)} icon={Layers3} href="/master-data/grades" />
          <KpiCard label="Active Grades" value={String(catalogStats.activeGrades)} icon={Layers3} href="/master-data/grades" />
          <KpiCard label="Products" value={String(catalogStats.products)} icon={Boxes} href="/catalog" />
          <KpiCard label="Active Products" value={String(catalogStats.activeProducts)} icon={ShoppingCart} href="/catalog" />
        </div>
      )}
      <section className="rounded-md border bg-white p-4 shadow-soft">
        <p className="section-label mb-3">Operations Oversight</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Pending KYC" value={String(pendingKyc)} href="/kyc" tone="warning" />
          <KpiCard label="Pending Payments" value={String(pendingPayments)} href="/payments" tone="warning" />
          <KpiCard label="Pending Dispatch" value={String(pendingDispatch)} href="/logistics" tone="warning" />
          <KpiCard label="Open Disputes" value={String(openDisputes.length)} href="/disputes" tone="danger" />
          <KpiCard label="Delayed Deliveries" value={String(delayed)} href="/logistics" tone="danger" />
        </div>
      </section>
      <section className="rounded-md border bg-white p-4 shadow-soft">
        <p className="section-label mb-3">PetroTrade Credit</p>
        {creditLoading ? (
          <KpiSkeleton />
        ) : (
          <>
            {creditStats.error ? (
              <p className="mb-3 text-sm text-muted-foreground">
                Credit KPIs require the admin credit API. {creditStats.error}.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Credit applications" value={creditStats.pendingApplications} href="/credit/applications" tone="warning" />
              <KpiCard label="Active credit accounts" value={creditStats.approvedAccounts} href="/credit/accounts" />
              <KpiCard label="Outstanding" value={creditStats.outstanding} href="/credit/repayments" />
              <KpiCard label="Overdue" value={creditStats.overdue} href="/credit/repayments" tone="danger" />
            </div>
          </>
        )}
      </section>
      <CmsOverview />
      <div className="grid gap-4 xl:grid-cols-2">
        {catalogLoading ? (
          <ChartSkeleton />
        ) : (
          <ChartCard title="Catalog source of truth">
            <p className="text-sm text-muted-foreground">
              Grade Master and Product records are loaded from PostgreSQL through Swaroop-Backend.
              Credit KPIs are loaded from PetroTrade Credit Management APIs.
            </p>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between"><span>Grades in master</span><span className="font-semibold">{catalogStats.grades}</span></div>
              <div className="flex justify-between"><span>Active grades</span><span className="font-semibold">{catalogStats.activeGrades}</span></div>
              <div className="flex justify-between"><span>Products</span><span className="font-semibold">{catalogStats.products}</span></div>
              <div className="flex justify-between"><span>Active products</span><span className="font-semibold">{catalogStats.activeProducts}</span></div>
            </div>
          </ChartCard>
        )}
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
    </div>
  );
}

const APP_SUB = "PetroTrade OS";
