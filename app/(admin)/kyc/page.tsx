"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type { KycStatus } from "@/types";

export default function KycPage() {
  const rows = useDataStore((s) => s.kyc);
  const updateKyc = useDataStore((s) => s.updateKyc);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<{ id: string; next: KycStatus } | null>(null);
  const [notes, setNotes] = useState("");

  return (
    <>
      <EntityWorkbench
        title="KYC Control Center"
        description="Review customer and seller verification packs from all applications."
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "entity", header: "Entity", sortable: true, accessor: (r) => r.entity },
          { key: "type", header: "Type", accessor: (r) => r.type },
          { key: "submitted", header: "Submitted", sortable: true, accessor: (r) => r.submitted, render: (r) => formatDateTime(r.submitted) },
          { key: "documents", header: "Documents", accessor: (r) => r.documents },
          { key: "risk", header: "Risk", render: (r) => <StatusBadge value={r.risk} /> },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "reviewer", header: "Reviewer", accessor: (r) => r.reviewer },
          { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
        ]}
        searchPlaceholder="Search KYC records"
        searchFn={(r, q) => `${r.entity} ${r.type} ${r.gst} ${r.pan}`.toLowerCase().includes(q)}
        filters={[
          { label: "Pending", value: "Pending", predicate: (r) => r.status === "Pending" },
          { label: "Under Review", value: "Under Review", predicate: (r) => r.status === "Under Review" },
          { label: "Approved", value: "Approved", predicate: (r) => r.status === "Approved" },
          { label: "Rejected", value: "Rejected", predicate: (r) => r.status === "Rejected" },
          { label: "Expired", value: "Expired", predicate: (r) => r.status === "Expired" },
        ]}
        emptyTitle="No KYC records found."
        emptyDescription="KYC submitted from Customer and Seller apps will appear here."
        exportName="kyc"
        exportRow={(r) => ({ id: r.id, entity: r.entity, status: r.status, source: r.source })}
        drawerTitle={(r) => r.entity}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Type" value={`${r.entityType} · ${r.type}`} />
            <DetailRow label="GST" value={r.gst} />
            <DetailRow label="PAN" value={r.pan} />
            <DetailRow label="Bank" value={r.bank} />
            <DetailRow label="Documents" value={r.documents} />
            <DetailRow label="Notes" value={r.notes || "—"} />
            <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
          </dl>
        )}
        drawerFooter={(r) => (
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" onClick={() => setPending({ id: r.id, next: "Approved" })}>Approve</Button>
            <Button size="sm" variant="destructive" onClick={() => setPending({ id: r.id, next: "Rejected" })}>Reject</Button>
            <Button size="sm" variant="outline" onClick={() => setPending({ id: r.id, next: "Under Review" })}>Request Changes</Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={`${pending?.next === "Approved" ? "Approve" : pending?.next === "Rejected" ? "Reject" : "Request changes on"} KYC`}
        description="Reviewer notes are stored on the mock KYC record and audit log."
        destructive={pending?.next === "Rejected"}
        extra={<Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reviewer notes" />}
        onConfirm={() => {
          if (!pending) return;
          updateKyc(pending.id, { status: pending.next, notes, reviewer: user?.name ?? "Admin" });
          pushAudit({ admin: user?.name ?? "Admin", role: user?.role ?? "ADMIN", action: `${pending.next} KYC ${pending.id}`, module: "KYC", entity: pending.id, result: "Success" });
          toast.success("KYC updated");
          setPending(null);
          setNotes("");
        }}
      />
    </>
  );
}
