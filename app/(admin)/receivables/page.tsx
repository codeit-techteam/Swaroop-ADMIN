"use client";

import { useEffect, useState } from "react";

import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { DetailRow } from "@/components/shared/detail-drawer";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatInrExact } from "@/lib/format";
import { listOutstandingCreditAccounts } from "@/lib/api/credit";
import { useDataStore } from "@/store/data-store";
import type { Receivable } from "@/types";

function bucket(days: number) {
  if (days <= 0) return "Current";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function mapReceivable(account: Awaited<ReturnType<typeof listOutstandingCreditAccounts>>[number]): Receivable {
  const outstanding = Number(account.outstandingAmount) || 0;
  const overdue = Number(account.overdueAmount) || 0;
  const utilized = Number(account.utilizedAmount) || 0;
  return {
    id: account.id,
    customer: account.customer?.name ?? "Customer",
    invoice: account.accountNumber ?? account.id,
    invoiceDate: account.effectiveAt ?? account.createdAt,
    dueDate: account.reviewAt ?? account.expiresAt ?? account.createdAt,
    amount: Number(account.approvedLimit) || 0,
    paid: Math.max(0, utilized - outstanding),
    outstanding,
    daysOverdue: overdue > 0 ? 1 : 0,
    risk: overdue > 0 ? "High" : outstanding > 0 ? "Medium" : "Low",
    status: overdue > 0 ? "Overdue" : outstanding > 0 ? "Due" : "Current",
  };
}

export default function ReceivablesPage() {
  const rows = useDataStore((s) => s.receivables);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const accounts = await listOutstandingCreditAccounts();
      useDataStore.setState({ receivables: accounts.map(mapReceivable) });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load receivables.");
      useDataStore.setState({ receivables: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <EntityWorkbench
      title="Receivables"
      description="PetroTrade credit outstanding and collection risk from PostgreSQL."
      loading={loading}
      loadingError={loadError}
      onRetry={() => void load()}
      kpis={[
        { label: "0-30", value: String(rows.filter((r) => bucket(r.daysOverdue) === "0-30").length) },
        { label: "31-60", value: String(rows.filter((r) => bucket(r.daysOverdue) === "31-60").length), tone: "warning" },
        { label: "61-90", value: String(rows.filter((r) => bucket(r.daysOverdue) === "61-90").length), tone: "warning" },
        { label: "90+", value: String(rows.filter((r) => bucket(r.daysOverdue) === "90+").length), tone: "danger" },
      ]}
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "customer", header: "Customer", sortable: true, accessor: (r) => r.customer },
        { key: "invoice", header: "Invoice", accessor: (r) => r.invoice },
        { key: "invoiceDate", header: "Invoice Date", render: (r) => formatDate(r.invoiceDate) },
        { key: "due", header: "Due Date", render: (r) => formatDate(r.dueDate) },
        { key: "amount", header: "Amount", sortable: true, accessor: (r) => r.amount, render: (r) => formatInrExact(r.amount) },
        { key: "paid", header: "Paid", accessor: (r) => r.paid, render: (r) => formatInrExact(r.paid) },
        { key: "out", header: "Outstanding", sortable: true, accessor: (r) => r.outstanding, render: (r) => formatInrExact(r.outstanding) },
        { key: "days", header: "Days Overdue", sortable: true, accessor: (r) => r.daysOverdue },
        { key: "risk", header: "Risk", render: (r) => <StatusBadge value={r.risk} /> },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      searchPlaceholder="Search invoices"
      searchFn={(r, q) => `${r.customer} ${r.invoice}`.toLowerCase().includes(q)}
      filters={[
        { label: "Current", value: "Current", predicate: (r) => r.status === "Current" },
        { label: "Due", value: "Due", predicate: (r) => r.status === "Due" },
        { label: "Overdue", value: "Overdue", predicate: (r) => r.status === "Overdue" },
        { label: "Collected", value: "Collected", predicate: (r) => r.status === "Collected" },
      ]}
      emptyTitle="No receivables found."
      emptyDescription="Outstanding PetroTrade credit balances will appear here."
      exportName="receivables"
      exportRow={(r) => ({ invoice: r.invoice, customer: r.customer, outstanding: r.outstanding, daysOverdue: r.daysOverdue })}
      drawerTitle={(r) => r.invoice}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Customer" value={r.customer} />
          <DetailRow label="Aging bucket" value={bucket(r.daysOverdue)} />
          <DetailRow label="Outstanding" value={formatInrExact(r.outstanding)} />
        </dl>
      )}
    />
  );
}
