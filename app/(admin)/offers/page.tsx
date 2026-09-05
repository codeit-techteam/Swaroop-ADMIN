"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type { Offer } from "@/types";

export default function OffersPage() {
  const rows = useDataStore((s) => s.offers);
  const updateOffer = useDataStore((s) => s.updateOffer);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<{ id: string; status: Offer["status"] } | null>(null);

  return (
    <>
      <EntityWorkbench
        title="Offers"
        description="Admin visibility over seller offers from Seller App and Seller Web App."
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "id", header: "Offer ID", sortable: true, accessor: (r) => r.id },
          { key: "seller", header: "Seller", sortable: true, accessor: (r) => r.seller },
          { key: "grade", header: "Grade", accessor: (r) => r.grade },
          { key: "price", header: "Price", sortable: true, accessor: (r) => r.price, render: (r) => `₹${r.price}` },
          { key: "qty", header: "Quantity", sortable: true, accessor: (r) => r.quantity },
          { key: "validity", header: "Validity", render: (r) => formatDate(r.validity) },
          { key: "location", header: "Location", accessor: (r) => r.location },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
        ]}
        searchPlaceholder="Search offers"
        searchFn={(r, q) => `${r.id} ${r.seller} ${r.grade} ${r.location}`.toLowerCase().includes(q)}
        filters={[
          { label: "Draft", value: "Draft", predicate: (r) => r.status === "Draft" },
          { label: "Pending Review", value: "Pending Review", predicate: (r) => r.status === "Pending Review" },
          { label: "Active", value: "Active", predicate: (r) => r.status === "Active" },
          { label: "Paused", value: "Paused", predicate: (r) => r.status === "Paused" },
          { label: "Expired", value: "Expired", predicate: (r) => r.status === "Expired" },
          { label: "Rejected", value: "Rejected", predicate: (r) => r.status === "Rejected" },
        ]}
        emptyTitle="No offers found."
        emptyDescription="Seller offers from Seller App and Seller Web App will appear here."
        exportName="offers"
        exportRow={(r) => ({ id: r.id, seller: r.seller, grade: r.grade, status: r.status, source: r.source })}
        drawerTitle={(r) => r.id}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Seller" value={r.seller} />
            <DetailRow label="Grade" value={r.grade} />
            <DetailRow label="Price" value={`₹${r.price}`} />
            <DetailRow label="Bulk price" value={`₹${r.bulkPrice}`} />
            <DetailRow label="Remarks" value={r.remarks} />
            <DetailRow label="Location" value={r.location} />
            <DetailRow label="Validity" value={formatDate(r.validity)} />
            <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
          </dl>
        )}
        drawerFooter={(r) => (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => setPending({ id: r.id, status: "Active" })}>Approve / Activate</Button>
            <Button size="sm" variant="destructive" onClick={() => setPending({ id: r.id, status: "Rejected" })}>Reject</Button>
            <Button size="sm" variant="outline" onClick={() => setPending({ id: r.id, status: "Paused" })}>Pause</Button>
            <Button size="sm" variant="outline" onClick={() => setPending({ id: r.id, status: "Pending Review" })}>Request Revision</Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title="Update offer"
        description="Offer status changes are Admin Portal actions and are written to the audit log."
        destructive={pending?.status === "Rejected"}
        onConfirm={() => {
          if (!pending) return;
          updateOffer(pending.id, { status: pending.status });
          pushAudit({ admin: user?.name ?? "Admin", role: user?.role ?? "ADMIN", action: `Set offer ${pending.id} to ${pending.status}`, module: "Offers", entity: pending.id, result: "Success" });
          toast.success("Offer updated");
          setPending(null);
        }}
      />
    </>
  );
}
