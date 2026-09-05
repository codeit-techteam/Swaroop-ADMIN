"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatInr } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type { Dispute } from "@/types";

export default function DisputesPage() {
  const rows = useDataStore((s) => s.disputes);
  const updateDispute = useDataStore((s) => s.updateDispute);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<{ id: string; status: Dispute["status"] } | null>(null);

  return (
    <>
      <EntityWorkbench
        title="Disputes"
        description="Quality, quantity, price, delivery, payment and documentation claims."
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "id", header: "Dispute ID", sortable: true, accessor: (r) => r.id },
          { key: "order", header: "Order", accessor: (r) => r.orderId },
          { key: "customer", header: "Customer", accessor: (r) => r.customer },
          { key: "seller", header: "Seller", accessor: (r) => r.seller },
          { key: "category", header: "Category", accessor: (r) => r.category },
          { key: "amount", header: "Amount", sortable: true, accessor: (r) => r.amount, render: (r) => formatInr(r.amount) },
          { key: "priority", header: "Priority", render: (r) => <StatusBadge value={r.priority} /> },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "created", header: "Created", render: (r) => formatDateTime(r.createdAt) },
          { key: "assigned", header: "Assigned To", accessor: (r) => r.assignedTo },
        ]}
        searchPlaceholder="Search disputes"
        searchFn={(r, q) => `${r.id} ${r.orderId} ${r.customer} ${r.seller} ${r.category}`.toLowerCase().includes(q)}
        emptyTitle="No disputes found."
        emptyDescription="Marketplace disputes will appear here."
        exportName="disputes"
        exportRow={(r) => ({ id: r.id, order: r.orderId, status: r.status, category: r.category })}
        drawerTitle={(r) => r.id}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Order" value={r.orderId} />
            <DetailRow label="Category" value={r.category} />
            <DetailRow label="Priority" value={<StatusBadge value={r.priority} />} />
            <DetailRow label="Assigned" value={r.assignedTo} />
          </dl>
        )}
        drawerFooter={(r) => (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => { updateDispute(r.id, { assignedTo: user?.name ?? "Admin", status: "Investigating" }); toast.success("Assigned"); }}>Assign</Button>
            <Button size="sm" variant="outline" onClick={() => setPending({ id: r.id, status: "Awaiting Info" })}>Request Info</Button>
            <Button size="sm" onClick={() => setPending({ id: r.id, status: "Resolved" })}>Resolve</Button>
            <Button size="sm" variant="destructive" onClick={() => setPending({ id: r.id, status: "Rejected" })}>Reject</Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title="Update dispute"
        description="Resolution actions are logged against the Admin Portal."
        destructive={pending?.status === "Rejected"}
        onConfirm={() => {
          if (!pending) return;
          updateDispute(pending.id, { status: pending.status });
          pushAudit({ admin: user?.name ?? "Admin", role: user?.role ?? "ADMIN", action: `Dispute ${pending.id} → ${pending.status}`, module: "Disputes", entity: pending.id, result: "Success" });
          toast.success("Dispute updated");
          setPending(null);
        }}
      />
    </>
  );
}
