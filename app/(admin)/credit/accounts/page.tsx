"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listCreditAccounts } from "@/lib/api/credit";
import { ACCOUNT_STATUSES, displayMoney, displayPercent } from "@/lib/credit-format";

export default function CreditAccountsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useCreditQuery(
    () => listCreditAccounts({ search, status: status || undefined, page, limit: 20 }),
    [search, status, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Accounts"
        description="PetroTrade credit limits, availability and outstanding balances."
        breadcrumbs={[{ label: "Credit Management", href: "/credit" }, { label: "Accounts" }]}
      />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search account or customer"
        status={status}
        statuses={ACCOUNT_STATUSES.map((item) => ({ value: item, label: item }))}
        onStatus={(value) => {
          setPage(1);
          setStatus(value);
        }}
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit accounts…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`/credit/accounts/${row.id}`)}
            emptyTitle="No credit accounts found."
            emptyDescription="Approved PetroTrade credit accounts will appear here."
            columns={[
              { key: "account", header: "Credit Account", accessor: (r) => r.accountNumber ?? r.id },
              { key: "customer", header: "Customer", accessor: (r) => r.customer.name },
              { key: "limit", header: "Approved Limit", render: (r) => displayMoney(r.approvedLimit) },
              { key: "available", header: "Available", render: (r) => displayMoney(r.availableLimit) },
              { key: "utilized", header: "Utilized", render: (r) => displayMoney(r.utilizedAmount) },
              { key: "outstanding", header: "Outstanding", render: (r) => displayMoney(r.outstandingAmount) },
              { key: "overdue", header: "Overdue", render: (r) => displayMoney(r.overdueAmount) },
              { key: "util", header: "Utilization %", render: (r) => displayPercent(r.utilizationPercentage) },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.accountStatus} /> },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
