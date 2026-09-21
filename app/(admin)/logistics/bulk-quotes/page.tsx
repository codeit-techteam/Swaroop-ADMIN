"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { useBulkLogisticsQuery } from "@/components/logistics/use-bulk-logistics-query";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listBulkLogisticsQuotes } from "@/lib/api/bulk-logistics-quotes";
import { formatDate } from "@/lib/format";
import { BULK_LOGISTICS_STATUSES } from "@/types/bulk-logistics-quote";

export default function BulkLogisticsQuotesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useBulkLogisticsQuery(
    () => listBulkLogisticsQuotes({ search, status: status || undefined, page, limit: 20 }),
    [search, status, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Bulk Logistics Quotes"
        description="Customer bulk logistics requests submitted from the mobile app. Review and respond from here."
        breadcrumbs={[
          { label: "Logistics", href: "/logistics" },
          { label: "Bulk Quotes" },
        ]}
      />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search request, company, or location"
        status={status}
        statuses={BULK_LOGISTICS_STATUSES.map((item) => ({
          value: item,
          label: item.replaceAll("_", " "),
        }))}
        onStatus={(value) => {
          setPage(1);
          setStatus(value);
        }}
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading bulk logistics quotes…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState
          title="Unable to load bulk logistics quotes. Please try again."
          description={error}
          onRetry={reload}
        />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`/logistics/bulk-quotes/${row.id}`)}
            emptyTitle="No bulk logistics quotes found."
            emptyDescription="Customer submissions from Get Bulk Logistics will appear here."
            columns={[
              { key: "id", header: "Request ID", accessor: (r) => r.requestNumber },
              { key: "company", header: "Company", accessor: (r) => r.companyName },
              { key: "material", header: "Material", accessor: (r) => r.materialName },
              {
                key: "qty",
                header: "Quantity",
                accessor: (r) => `${r.quantityMt} MT`,
              },
              {
                key: "route",
                header: "Route",
                accessor: (r) => `${r.pickupLocation} → ${r.deliveryLocation}`,
              },
              { key: "date", header: "Submitted", render: (r) => formatDate(r.createdAt) },
              { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              {
                key: "admin",
                header: "Assigned Admin",
                accessor: (r) => r.assignedAdminName ?? "Unassigned",
              },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
