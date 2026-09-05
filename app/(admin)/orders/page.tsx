"use client";

import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatInr } from "@/lib/format";
import { useDataStore } from "@/store/data-store";

export default function OrdersPage() {
  const rows = useDataStore((s) => s.orders);
  return (
    <EntityWorkbench
      title="Orders"
      description="Orders generated from Customer Mobile App and Customer Web App."
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "id", header: "Order ID", sortable: true, accessor: (r) => r.id },
        { key: "buyer", header: "Buyer", sortable: true, accessor: (r) => r.buyer },
        { key: "seller", header: "Seller", accessor: (r) => r.seller },
        { key: "grade", header: "Grade", accessor: (r) => r.grade },
        { key: "qty", header: "Quantity", sortable: true, accessor: (r) => r.quantity },
        { key: "value", header: "Value", sortable: true, accessor: (r) => r.value, render: (r) => formatInr(r.value) },
        { key: "payment", header: "Payment", render: (r) => <StatusBadge value={r.payment} /> },
        { key: "dispatch", header: "Dispatch", accessor: (r) => r.dispatch },
        { key: "shipment", header: "Shipment", accessor: (r) => r.shipment },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
      ]}
      searchPlaceholder="Search orders"
      searchFn={(r, q) => `${r.id} ${r.buyer} ${r.seller} ${r.grade}`.toLowerCase().includes(q)}
      filters={[
        { label: "Pending", value: "Pending", predicate: (r) => r.status === "Pending" },
        { label: "In Transit", value: "In Transit", predicate: (r) => r.status === "In Transit" },
        { label: "Delivered", value: "Delivered", predicate: (r) => r.status === "Delivered" },
        { label: "Disputed", value: "Disputed", predicate: (r) => r.status === "Disputed" },
        { label: "Cancelled", value: "Cancelled", predicate: (r) => r.status === "Cancelled" },
      ]}
      emptyTitle="No orders found."
      emptyDescription="Orders from Customer App and Customer Web App will appear here."
      exportName="orders"
      exportRow={(r) => ({ id: r.id, buyer: r.buyer, seller: r.seller, grade: r.grade, value: r.value, status: r.status, source: r.source })}
      drawerTitle={(r) => r.id}
      drawerDescription={(r) => `${r.buyer} → ${r.seller}`}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Customer" value={r.buyer} />
          <DetailRow label="Seller" value={r.seller} />
          <DetailRow label="Grade" value={r.grade} />
          <DetailRow label="Quantity" value={`${r.quantity} MT`} />
          <DetailRow label="Value" value={formatInr(r.value)} />
          <DetailRow label="Payment" value={<StatusBadge value={r.payment} />} />
          <DetailRow label="Dispatch" value={r.dispatch} />
          <DetailRow label="Shipment" value={r.shipment} />
          <DetailRow label="Created" value={formatDateTime(r.createdAt)} />
          <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
        </dl>
      )}
    />
  );
}
