"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listCreditInsurance } from "@/lib/api/credit";
import { displayMoney } from "@/lib/credit-format";
import { formatDate } from "@/lib/format";

export default function CreditInsurancePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useCreditQuery(
    () => listCreditInsurance({ search, page, limit: 20 }),
    [search, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Insurance"
        description="PetroTrade-level credit insurance metadata. No fake provider integration is connected."
        breadcrumbs={[{ label: "Credit Management", href: "/credit" }, { label: "Insurance" }]}
      />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search customer"
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit insurance…</p>
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
            emptyTitle="No credit insurance records."
            emptyDescription="Insurance metadata can be attached to a credit account when a provider is onboarded."
            columns={[
              { key: "customer", header: "Customer", accessor: (r) => r.customer?.name ?? "—" },
              { key: "account", header: "Credit Account", accessor: (r) => r.accountNumber ?? r.creditAccountId },
              { key: "provider", header: "Provider", accessor: (r) => r.providerName ?? "Not connected" },
              { key: "policy", header: "Policy Number", accessor: (r) => r.policyNumber ?? "—" },
              { key: "cover", header: "Coverage Amount", render: (r) => displayMoney(r.coverageAmount) },
              { key: "status", header: "Coverage Status", render: (r) => <StatusBadge value={r.status} /> },
              { key: "start", header: "Start Date", render: (r) => (r.startDate ? formatDate(r.startDate) : "—") },
              { key: "end", header: "End Date", render: (r) => (r.endDate ? formatDate(r.endDate) : "—") },
              { key: "claim", header: "Claim Status", render: (r) => <StatusBadge value={r.claimStatus} /> },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
