"use client";

import { useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listCreditRepayments } from "@/lib/api/credit";
import { displayMoney } from "@/lib/credit-format";
import { formatDate } from "@/lib/format";

export default function CreditRepaymentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useCreditQuery(
    () => listCreditRepayments({ search, page, limit: 20 }),
    [search, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Repayments"
        description="Repayment state comes from existing payment schedules. Due dates never auto-mark a row as paid."
        breadcrumbs={[{ label: "Credit Management", href: "/credit" }, { label: "Repayments" }]}
      />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search customer or purchase order"
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit repayments…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            emptyTitle="No credit repayments found."
            emptyDescription="Credit-linked payment schedules from finance will appear here."
            columns={[
              { key: "customer", header: "Customer", accessor: (r) => r.customer.name },
              { key: "account", header: "Credit Account", accessor: (r) => r.accountNumber ?? r.creditAccountId },
              { key: "ref", header: "Payment Reference", accessor: (r) => r.paymentReference },
              { key: "dueAmt", header: "Due Amount", render: (r) => displayMoney(r.dueAmount) },
              { key: "paid", header: "Paid Amount", render: (r) => displayMoney(r.paidAmount) },
              { key: "remain", header: "Remaining Amount", render: (r) => displayMoney(r.remainingAmount) },
              { key: "due", header: "Due Date", render: (r) => (r.dueDate ? formatDate(r.dueDate) : "—") },
              { key: "paidDate", header: "Paid Date", render: (r) => (r.paidDate ? formatDate(r.paidDate) : "—") },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
