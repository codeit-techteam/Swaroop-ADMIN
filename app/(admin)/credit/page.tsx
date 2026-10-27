"use client";

import Link from "next/link";

import { CreditSourceBadge } from "@/components/credit/credit-source-badge";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, KpiSkeleton } from "@/components/shared/states";
import { getCreditApplicationStats, getCreditSummary } from "@/lib/api/credit";
import { displayMoney } from "@/lib/credit-format";

export default function CreditOverviewPage() {
  const { data, error, loading, reload } = useCreditQuery(() => getCreditSummary(), []);
  const stats = useCreditQuery(() => getCreditApplicationStats(), []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="PolyStoreX Credit Management"
        description="Admin operates platform credit. Sellers do not provide customer credit."
        breadcrumbs={[{ label: "Finance" }, { label: "Credit Management" }]}
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit overview…</p>
          <KpiSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Credit customers" value={String(data.totalCustomers)} href="/credit/accounts" />
            <KpiCard label="Pending applications" value={String(data.pendingApplications)} href="/credit/applications" tone="warning" />
            <KpiCard label="Approved accounts" value={String(data.approvedAccounts)} href="/credit/accounts" />
            <KpiCard label="Active credit" value={String(data.activeCredit)} href="/credit/accounts" tone="success" />
            <KpiCard label="Requiring action" value={String(data.applicationsRequiringAction)} href="/credit/applications" tone="danger" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Approved limit" value={displayMoney(data.approvedLimit)} href="/credit/accounts" />
            <KpiCard label="Available credit" value={displayMoney(data.availableCredit)} href="/credit/utilization" tone="success" />
            <KpiCard label="Utilized credit" value={displayMoney(data.utilizedCredit)} href="/credit/utilization" />
            <KpiCard label="Outstanding" value={displayMoney(data.outstandingAmount)} href="/credit/repayments" />
            <KpiCard label="Overdue" value={displayMoney(data.overdueAmount)} href="/credit/repayments" tone="danger" />
          </div>
          {stats.error ? (
            <ErrorState
              title="Unable to load application tracking."
              description={stats.error}
              onRetry={stats.reload}
            />
          ) : stats.data ? (
            <>
              <p className="section-label">Credit applications</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Total applications" value={String(stats.data.total)} href="/credit/applications" />
                <KpiCard
                  label="Website applications"
                  value={String(stats.data.website)}
                  href="/credit/applications?source=WEBSITE"
                />
                <KpiCard
                  label="Website today"
                  value={String(stats.data.websiteToday)}
                  href="/credit/applications?source=WEBSITE&date=today"
                />
                <KpiCard
                  label="Website this month"
                  value={String(stats.data.websiteThisMonth)}
                  href="/credit/applications?source=WEBSITE&date=month"
                />
                <KpiCard
                  label="Pending review"
                  value={String(stats.data.pendingReview)}
                  href="/credit/applications?status=PENDING"
                  tone="warning"
                />
                <KpiCard
                  label="Documents required"
                  value={String(stats.data.documentsRequired)}
                  href="/credit/applications?status=DOCUMENTS_REQUIRED"
                  tone="warning"
                />
                <KpiCard
                  label="Approved"
                  value={String(stats.data.approved)}
                  href="/credit/applications?status=APPROVED"
                  tone="success"
                />
                <KpiCard
                  label="Rejected"
                  value={String(stats.data.rejected)}
                  href="/credit/applications?status=REJECTED"
                  tone="danger"
                />
              </div>
              <section className="rounded-md border bg-white p-4">
                <p className="section-label mb-3">Applications by source</p>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.data.bySource.map((row) => (
                    <li key={row.source ?? "NOT_RECORDED"}>
                      <Link
                        href={`/credit/applications?source=${row.source ?? "NOT_RECORDED"}`}
                        className="flex items-center justify-between rounded border px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <CreditSourceBadge source={row.source} />
                        <span className="font-semibold tabular-nums">{row.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
          <section className="rounded-md border bg-white p-4 text-sm text-muted-foreground">
            Values are provided by Swaroop Backend / PostgreSQL. Customer credit is assigned and monitored here;
            sellers only fulfil the commercial order.{" "}
            <Link href="/credit/applications" className="font-medium text-primary">
              Review applications
            </Link>
            .
          </section>
        </>
      ) : null}
    </div>
  );
}
