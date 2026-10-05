"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, KpiSkeleton } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  describeApiFailure,
  getAdminDashboard,
  type AdminDashboardSummary,
} from "@/lib/api/control-center";
import { getAdminKycMetrics } from "@/lib/api/ops";
import { downloadCsv } from "@/lib/csv";
import { displayMoney } from "@/lib/credit-format";
import { formatDateTime, greetingForNow } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import type { AdminKycMetrics } from "@/types";

const RANGES = [
  { label: "All", days: undefined },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "90 Days", days: 90 },
] as const;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [days, setDays] = useState<number | undefined>(30);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [kyc, setKyc] = useState<AdminKycMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextKyc] = await Promise.all([
        getAdminDashboard(days),
        getAdminKycMetrics().catch(() => null),
      ]);
      setSummary(nextSummary);
      setKyc(nextKyc);
    } catch (cause) {
      setSummary(null);
      setError(describeApiFailure(cause));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const ops = summary?.operations;
  const rangeLabel = RANGES.find((item) => item.days === days)?.label ?? "All";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Admin Dashboard"
        description={`Live counts from Swaroop-Backend · ${rangeLabel} window for flow metrics`}
        breadcrumbs={[{ label: "PetroTrade OS" }, { label: "Dashboard" }]}
        actions={
          <>
            {RANGES.map((item) => (
              <Button
                key={item.label}
                type="button"
                size="sm"
                variant={days === item.days ? "default" : "outline"}
                onClick={() => setDays(item.days)}
              >
                {item.label}
              </Button>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className="size-3.5" />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!ops}
              onClick={() => {
                if (!ops) return;
                downloadCsv("admin-dashboard.csv", [
                  { metric: "Active customers", value: ops.customers.active },
                  { metric: "Pending KYC", value: ops.customers.pendingKyc },
                  { metric: "Active sellers", value: ops.sellers.active },
                  { metric: "Pending seller approvals", value: ops.sellers.pendingApproval },
                  ...(kyc
                    ? [
                        { metric: "KYC awaiting review", value: kyc.status.UNDER_REVIEW ?? 0 },
                        { metric: "PAN verified", value: kyc.pan.verified },
                        { metric: "GST verified", value: kyc.gst.verified },
                        { metric: "GST/PAN mismatches", value: kyc.mismatches },
                      ]
                    : []),
                  { metric: "Orders", value: ops.orders.total },
                  { metric: "Open negotiations", value: ops.importTrading.openNegotiations },
                  { metric: "Confirmed import deals", value: ops.importTrading.confirmedDeals },
                ]);
              }}
            >
              Export
            </Button>
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        {greetingForNow()}, {user?.name ?? "Admin"}
      </p>

      {loading ? <KpiSkeleton count={8} /> : null}
      {!loading && error ? <ErrorState title="Dashboard unavailable" description={error} onRetry={() => void load()} /> : null}
      {!loading && summary && !ops ? (
        <ErrorState
          title="Dashboard API is missing operational metrics"
          description="This Admin build expects Swaroop-Backend /admin/dashboard/summary to return an operations object. Point NEXT_PUBLIC_API_BASE_URL at the updated backend and refresh."
          onRetry={() => void load()}
        />
      ) : null}

      {!loading && ops ? (
        <>
          <section className="rounded-md border bg-white p-4 shadow-soft">
            <p className="section-label mb-3">Customers and sellers</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Customers" value={String(ops.customers.total)} href="/customers" />
              <KpiCard label="Active customers" value={String(ops.customers.active)} href="/customers" tone="success" />
              <KpiCard label="Pending KYC" value={String(ops.customers.pendingKyc)} href="/kyc" tone="warning" />
              <KpiCard label="Sellers" value={String(ops.sellers.total)} href="/sellers" />
              <KpiCard label="Active sellers" value={String(ops.sellers.active)} href="/sellers" tone="success" />
              <KpiCard label="Pending seller approvals" value={String(ops.sellers.pendingApproval)} href="/sellers" tone="warning" />
              <KpiCard label="Suspended customers" value={String(ops.customers.suspended)} href="/customers" tone="danger" />
              <KpiCard label="Suspended sellers" value={String(ops.sellers.suspended)} href="/sellers" tone="danger" />
            </div>
          </section>

          {kyc ? (
            <section className="rounded-md border bg-white p-4 shadow-soft">
              <p className="section-label mb-3">KYC verification</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Awaiting review" value={String(kyc.status.UNDER_REVIEW ?? 0)} href="/kyc" tone="warning" />
                <KpiCard label="Changes requested" value={String(kyc.status.CHANGES_REQUESTED ?? 0)} href="/kyc" />
                <KpiCard label="Approved" value={String(kyc.status.APPROVED ?? 0)} href="/kyc" tone="success" />
                <KpiCard label="Rejected" value={String(kyc.status.REJECTED ?? 0)} href="/kyc" tone="danger" />
                <KpiCard
                  label="PAN verified / failed"
                  value={`${kyc.pan.verified} / ${kyc.pan.failed}`}
                  href="/kyc"
                />
                <KpiCard
                  label="GST verified / failed"
                  value={`${kyc.gst.verified} / ${kyc.gst.failed}`}
                  href="/kyc"
                />
                <KpiCard
                  label="GST/PAN mismatches"
                  value={String(kyc.mismatches)}
                  href="/kyc"
                  tone={kyc.mismatches ? "danger" : "default"}
                />
                <KpiCard
                  label="Documents pending review"
                  value={String(kyc.documentsPending)}
                  href="/kyc"
                  tone="warning"
                />
              </div>
            </section>
          ) : null}

          <section className="rounded-md border bg-white p-4 shadow-soft">
            <p className="section-label mb-3">Orders</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard label="New" value={String(ops.orders.created)} href="/orders" />
              <KpiCard label="Processing" value={String(ops.orders.processing)} href="/orders" />
              <KpiCard label="Dispatched" value={String(ops.orders.dispatched)} href="/orders" />
              <KpiCard label="Delivered" value={String(ops.orders.delivered)} href="/orders" tone="success" />
              <KpiCard label="Cancelled" value={String(ops.orders.cancelled)} href="/orders" tone="danger" />
            </div>
          </section>

          <section className="rounded-md border bg-white p-4 shadow-soft">
            <p className="section-label mb-3">Purchase requests</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Created" value={String(ops.purchaseRequests.created)} href="/procurement" />
              <KpiCard label="Pending seller response" value={String(ops.purchaseRequests.pendingSellerResponse)} href="/procurement" tone="warning" />
              <KpiCard label="Accepted" value={String(ops.purchaseRequests.accepted)} href="/procurement" tone="success" />
              <KpiCard label="Rejected" value={String(ops.purchaseRequests.rejected)} href="/procurement" tone="danger" />
              <KpiCard label="Counter offered" value={String(ops.purchaseRequests.counterOffered)} href="/procurement" />
              <KpiCard label="Expired" value={String(ops.purchaseRequests.expired)} href="/procurement" />
            </div>
          </section>

          <section className="rounded-md border bg-white p-4 shadow-soft">
            <p className="section-label mb-3">Import trading</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label="Active buy requests" value={String(ops.importTrading.activeBuyRequests)} href="/import-trading/listings" />
              <KpiCard label="Active sell offers" value={String(ops.importTrading.activeSellOffers)} href="/import-trading/listings" />
              <KpiCard label="Open negotiations" value={String(ops.importTrading.openNegotiations)} href="/import-trading/negotiations" tone="warning" />
              <KpiCard label="Confirmed deals" value={String(ops.importTrading.confirmedDeals)} href="/import-trading/deals" tone="success" />
            </div>
          </section>

          <section className="rounded-md border bg-white p-4 shadow-soft">
            <p className="section-label mb-3">Payments and logistics</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard label="Payments pending" value={String(ops.payments.pending)} href="/payments" tone="warning" />
              <KpiCard label="Verification required" value={String(ops.payments.verificationRequired)} href="/payments" tone="warning" />
              <KpiCard label="Payments success" value={String(ops.payments.success)} href="/payments" tone="success" />
              <KpiCard label="Payments failed" value={String(ops.payments.failed)} href="/payments" tone="danger" />
              <KpiCard label="Refunded" value={String(ops.payments.refunded)} href="/payments" />
              <KpiCard label="Ready for dispatch" value={String(ops.logistics.readyForDispatch)} href="/logistics" />
              <KpiCard label="Dispatched" value={String(ops.logistics.dispatched)} href="/logistics" />
              <KpiCard label="In transit" value={String(ops.logistics.inTransit)} href="/logistics" />
              <KpiCard label="Delivered shipments" value={String(ops.logistics.delivered)} href="/logistics" tone="success" />
              <KpiCard label="Delayed" value={String(ops.logistics.delayed)} href="/logistics" tone="danger" />
            </div>
          </section>

          {summary?.credit ? (
            <section className="rounded-md border bg-white p-4 shadow-soft">
              <p className="section-label mb-3">Credit</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Pending applications" value={String(summary.credit.pendingApplications)} href="/credit/applications" tone="warning" />
                <KpiCard label="Approved accounts" value={String(summary.credit.approvedAccounts)} href="/credit/accounts" />
                <KpiCard label="Outstanding" value={displayMoney(summary.credit.outstandingAmount)} href="/credit/repayments" />
                <KpiCard label="Overdue" value={displayMoney(summary.credit.overdueAmount)} href="/credit/repayments" tone="danger" />
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-md border bg-white p-4 shadow-soft">
              <p className="section-label mb-3">Recent orders</p>
              {ops.recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders in this window.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2">Order</th>
                      <th>Customer</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ops.recentOrders.map((order) => (
                      <tr key={order.id} className="border-t">
                        <td className="py-2">
                          <Link href={`/orders?id=${order.id}`} className="font-medium hover:underline">
                            {order.referenceNumber}
                          </Link>
                          <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                        </td>
                        <td>{order.customer}</td>
                        <td><StatusBadge value={order.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
            <section className="rounded-md border bg-white p-4 shadow-soft">
              <p className="section-label mb-3">Recent purchase requests</p>
              {ops.recentPurchaseRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No purchase requests in this window.</p>
              ) : (
                <ul className="space-y-2">
                  {ops.recentPurchaseRequests.map((item) => (
                    <li key={item.id}>
                      <Link href={`/procurement/${item.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
                        <span>
                          <span className="font-medium">{item.referenceNumber}</span>
                          <span className="ml-2 text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                        </span>
                        <StatusBadge value={item.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
