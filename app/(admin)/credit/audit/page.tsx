"use client";

import { useState } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { listCreditAudit } from "@/lib/api/credit";
import { humanizeCreditAction } from "@/lib/credit-format";
import { formatDateTime } from "@/lib/format";

export default function CreditAuditPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useCreditQuery(
    () => listCreditAudit({ search, page, limit: 20 }),
    [search, page],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Audit / History"
        description="Backend audit events for PetroTrade credit actions. Frontend does not invent timeline entries."
        breadcrumbs={[{ label: "Credit Management", href: "/credit" }, { label: "Audit" }]}
      />
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search is applied by the backend where supported"
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit audit trail…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            emptyTitle="No credit audit events."
            emptyDescription="Approvals, limit changes and suspensions will appear after admins act."
            columns={[
              { key: "time", header: "When", render: (r) => formatDateTime(r.createdAt) },
              { key: "action", header: "Action", accessor: (r) => humanizeCreditAction(r.action) },
              { key: "actor", header: "Actor", accessor: (r) => r.actor },
              { key: "entity", header: "Entity", accessor: (r) => r.entityId ?? "—" },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
