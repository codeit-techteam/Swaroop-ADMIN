"use client";

import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import { useDataStore } from "@/store/data-store";

export default function LogisticsPage() {
  const rows = useDataStore((s) => s.shipments);
  return (
    <EntityWorkbench
      title="Logistics"
      description="Milestone-based shipment tracking. This view does not claim live GPS."
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "id", header: "Shipment", sortable: true, accessor: (r) => r.id },
        { key: "order", header: "Order", accessor: (r) => r.orderId },
        { key: "customer", header: "Customer", accessor: (r) => r.customer },
        { key: "seller", header: "Seller", accessor: (r) => r.seller },
        { key: "grade", header: "Grade", accessor: (r) => r.grade },
        { key: "qty", header: "Qty", accessor: (r) => r.quantity },
        { key: "vehicle", header: "Vehicle", accessor: (r) => r.vehicle },
        { key: "route", header: "Route", accessor: (r) => r.route },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
      ]}
      searchPlaceholder="Search shipments"
      searchFn={(r, q) => `${r.id} ${r.orderId} ${r.customer} ${r.vehicle} ${r.route}`.toLowerCase().includes(q)}
      filters={[
        { label: "Scheduled", value: "Scheduled", predicate: (r) => r.status === "Scheduled" },
        { label: "Loading", value: "Loading", predicate: (r) => r.status === "Loading" },
        { label: "Dispatched", value: "Dispatched", predicate: (r) => r.status === "Dispatched" },
        { label: "In Transit", value: "In Transit", predicate: (r) => r.status === "In Transit" },
        { label: "Delivered", value: "Delivered", predicate: (r) => r.status === "Delivered" },
        { label: "Delayed", value: "Delayed", predicate: (r) => r.status === "Delayed" },
      ]}
      emptyTitle="No shipments found."
      emptyDescription="Shipment milestones will appear here."
      exportName="shipments"
      exportRow={(r) => ({ id: r.id, order: r.orderId, status: r.status, route: r.route })}
      drawerTitle={(r) => r.id}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Order" value={r.orderId} />
          <DetailRow label="Seller" value={r.seller} />
          <DetailRow label="Customer" value={r.customer} />
          <DetailRow label="Grade" value={`${r.grade} · ${r.quantity} MT`} />
          <DetailRow label="Vehicle" value={r.vehicle} />
          <DetailRow label="Route" value={r.route} />
          <DetailRow label="Milestone" value={r.milestone} />
          <DetailRow label="ETA" value={formatDateTime(r.eta)} />
          <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
        </dl>
      )}
    />
  );
}
