"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listCreditTransactions } from "@/lib/api/credit";
import { displayMoney } from "@/lib/credit-format";
import { formatDateTime } from "@/lib/format";

const TYPES = [
  "CREDIT_APPROVED",
  "CREDIT_LIMIT_ADJUSTED",
  "CREDIT_UTILIZED",
  "CREDIT_REPAID",
  "CREDIT_RELEASED",
  "CREDIT_ADJUSTMENT",
  "CREDIT_REFUND",
  "CREDIT_SUSPENDED",
];

export default function CreditTransactionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useCreditQuery(
    () => listCreditTransactions({ search, type: status || undefined, page, limit: 20 }),
    [search, status, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Transactions"
        description="Ledger events posted by PetroTrade Credit Management."
        breadcrumbs={[{ label: "Credit Management", href: "/credit" }, { label: "Transactions" }]}
      />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search transaction, customer or reference"
        status={status}
        statuses={TYPES.map((item) => ({ value: item, label: item.replaceAll("_", " ") }))}
        onStatus={(value) => {
          setPage(1);
          setStatus(value);
        }}
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit transactions…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`/credit/accounts/${row.creditAccountId}`)}
            emptyTitle="No credit transactions found."
            emptyDescription="Approvals, utilization and repayments are recorded by the backend."
            columns={[
              { key: "id", header: "Transaction ID", accessor: (r) => r.transactionNumber },
              { key: "customer", header: "Customer", accessor: (r) => r.customer?.name ?? "—" },
              { key: "account", header: "Credit Account", accessor: (r) => r.accountNumber ?? r.creditAccountId },
              { key: "refType", header: "Reference Type", accessor: (r) => r.referenceType ?? "—" },
              { key: "ref", header: "Reference ID", accessor: (r) => r.referenceId ?? "—" },
              { key: "amount", header: "Amount", render: (r) => displayMoney(r.amount) },
              { key: "type", header: "Type", render: (r) => <StatusBadge value={r.type} /> },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              { key: "date", header: "Date", render: (r) => formatDateTime(r.createdAt) },
              { key: "by", header: "Created By", accessor: (r) => r.createdBy },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
