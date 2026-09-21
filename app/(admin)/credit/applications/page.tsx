"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listCreditApplications } from "@/lib/api/credit";
import { APPLICATION_STATUSES, displayMoney } from "@/lib/credit-format";
import { formatDate } from "@/lib/format";

export default function CreditApplicationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useCreditQuery(
    () => listCreditApplications({ search, status: status || undefined, page, limit: 20 }),
    [search, status, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Applications"
        description="Review customers requesting PetroTrade credit. Seller approval is not part of this workflow."
        breadcrumbs={[{ label: "Credit Management", href: "/credit" }, { label: "Applications" }]}
      />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search application or customer"
        status={status}
        statuses={APPLICATION_STATUSES.map((item) => ({ value: item, label: item.replaceAll("_", " ") }))}
        onStatus={(value) => {
          setPage(1);
          setStatus(value);
        }}
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit applications…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`/credit/applications/${row.id}`)}
            emptyTitle="No credit applications found."
            emptyDescription="Customer applications from the backend will appear here."
            columns={[
              { key: "id", header: "Application ID", accessor: (r) => r.applicationNumber },
              { key: "customer", header: "Customer", accessor: (r) => r.customer.name },
              { key: "type", header: "Business Type", accessor: (r) => r.customer.businessType ?? "—" },
              { key: "date", header: "Application Date", render: (r) => formatDate(r.createdAt) },
              { key: "limit", header: "Requested Limit", render: (r) => displayMoney(r.requestedLimit) },
              { key: "status", header: "Current Status", render: (r) => <StatusBadge value={r.status} /> },
              { key: "docs", header: "Documents", accessor: (r) => r.documentCount },
              { key: "admin", header: "Assigned Admin", accessor: (r) => r.assignedAdminName ?? "Unassigned" },
              { key: "updated", header: "Last Updated", render: (r) => formatDate(r.updatedAt) },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
