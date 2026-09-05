"use client";

import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { formatInr } from "@/lib/format";
import { useDataStore } from "@/store/data-store";

export default function CreditInsurancePage() {
  const rows = useDataStore((s) => s.credit);
  const approved = rows.reduce((s, r) => s + r.approved, 0);
  const used = rows.reduce((s, r) => s + r.used, 0);
  const available = rows.reduce((s, r) => s + r.available, 0);
  const atRisk = rows.filter((r) => r.risk !== "Low").reduce((s, r) => s + r.overdue, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Credit Insurance" description="Customer-level credit exposure across the marketplace." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Credit Exposure" value={formatInr(used)} href="/receivables" />
        <KpiCard label="Approved Credit" value={formatInr(approved)} />
        <KpiCard label="Used Credit" value={formatInr(used)} />
        <KpiCard label="Available Credit" value={formatInr(available)} tone="success" />
        <KpiCard label="At Risk" value={formatInr(atRisk)} tone="danger" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Low Risk" value={`${rows.filter((r) => r.risk === "Low").length} accounts`} tone="success" />
        <KpiCard label="Medium Risk" value={`${rows.filter((r) => r.risk === "Medium").length} accounts`} tone="warning" />
        <KpiCard label="High Risk" value={`${rows.filter((r) => r.risk === "High").length} accounts`} tone="danger" />
      </div>
      <DataTable
        rows={rows}
        getRowId={(r) => r.id}
        emptyTitle="No credit accounts."
        emptyDescription="Customer credit limits will appear here."
        columns={[
          { key: "customer", header: "Customer", sortable: true, accessor: (r) => r.customer },
          { key: "approved", header: "Approved", sortable: true, accessor: (r) => r.approved, render: (r) => formatInr(r.approved) },
          { key: "used", header: "Used", sortable: true, accessor: (r) => r.used, render: (r) => formatInr(r.used) },
          { key: "available", header: "Available", sortable: true, accessor: (r) => r.available, render: (r) => formatInr(r.available) },
          { key: "overdue", header: "Overdue", sortable: true, accessor: (r) => r.overdue, render: (r) => formatInr(r.overdue) },
          { key: "risk", header: "Risk", render: (r) => <StatusBadge value={r.risk} /> },
        ]}
      />
    </div>
  );
}
