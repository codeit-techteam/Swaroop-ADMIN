"use client";

import { useEffect, useState } from "react";

import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatInrExact } from "@/lib/format";
import { listAdminPayments } from "@/lib/api/ops";
import { useDataStore } from "@/store/data-store";

export default function PaymentsPage() {
  const rows = useDataStore((s) => s.payments);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      useDataStore.setState({ payments: await listAdminPayments() });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load payments.");
      useDataStore.setState({ payments: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <EntityWorkbench
      title="Payments"
      description="Payment verification across customer, seller and Admin Portal actions."
      loading={loading}
      loadingError={loadError}
      onRetry={() => void load()}
      kpis={[
        { label: "Verified", value: String(rows.filter((r) => r.status === "Verified").length), tone: "success" },
        { label: "Pending", value: String(rows.filter((r) => r.status === "Pending").length), tone: "warning" },
        { label: "Failed", value: String(rows.filter((r) => r.status === "Failed").length), tone: "danger" },
        { label: "Volume", value: formatInrExact(rows.reduce((s, r) => s + r.amount, 0)) },
      ]}
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "id", header: "Payment ID", sortable: true, accessor: (r) => r.id },
        { key: "order", header: "Order", accessor: (r) => r.orderId },
        { key: "customer", header: "Customer", accessor: (r) => r.customer },
        { key: "seller", header: "Seller", accessor: (r) => r.seller },
        { key: "amount", header: "Amount", sortable: true, accessor: (r) => r.amount, render: (r) => formatInrExact(r.amount) },
        { key: "method", header: "Method", accessor: (r) => r.method },
        { key: "txn", header: "Transaction", accessor: (r) => r.transaction },
        { key: "date", header: "Date", sortable: true, accessor: (r) => r.date, render: (r) => formatDateTime(r.date) },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      searchPlaceholder="Search payments"
      searchFn={(r, q) => `${r.id} ${r.orderId} ${r.customer} ${r.transaction}`.toLowerCase().includes(q)}
      filters={[
        { label: "Pending", value: "Pending", predicate: (r) => r.status === "Pending" },
        { label: "Processing", value: "Processing", predicate: (r) => r.status === "Processing" },
        { label: "Verified", value: "Verified", predicate: (r) => r.status === "Verified" },
        { label: "Failed", value: "Failed", predicate: (r) => r.status === "Failed" },
        { label: "Refunded", value: "Refunded", predicate: (r) => r.status === "Refunded" },
      ]}
      emptyTitle="No payments found."
      emptyDescription="Payment activity from the marketplace will appear here."
      exportName="payments"
      exportRow={(r) => ({ id: r.id, order: r.orderId, amount: r.amount, status: r.status, source: r.source })}
      drawerTitle={(r) => r.id}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Order" value={r.orderId} />
          <DetailRow label="Customer" value={r.customer} />
          <DetailRow label="Seller" value={r.seller} />
          <DetailRow label="Amount" value={formatInrExact(r.amount)} />
          <DetailRow label="Method" value={r.method} />
          <DetailRow label="Transaction" value={r.transaction} />
          <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
        </dl>
      )}
    />
  );
}
