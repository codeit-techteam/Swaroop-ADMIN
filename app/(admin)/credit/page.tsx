"use client";

import Link from "next/link";

import { useCreditQuery } from "@/components/credit/use-credit-query";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, KpiSkeleton } from "@/components/shared/states";
import { getCreditSummary } from "@/lib/api/credit";
import { displayMoney } from "@/lib/credit-format";

export default function CreditOverviewPage() {
  const { data, error, loading, reload } = useCreditQuery(() => getCreditSummary(), []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="PetroTrade Credit Management"
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
