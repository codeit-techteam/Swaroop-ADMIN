"use client";

import { toast } from "sonner";

import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";

export default function DocumentsPage() {
  const rows = useDataStore((s) => s.documents);
  const updateDocument = useDataStore((s) => s.updateDocument);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);

  return (
    <EntityWorkbench
      title="Document Center"
      description="KYC, commercial and compliance artifacts across the ecosystem."
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "name", header: "Document", sortable: true, accessor: (r) => r.name },
        { key: "category", header: "Category", accessor: (r) => r.category },
        { key: "entity", header: "Entity", accessor: (r) => r.entity },
        { key: "uploaded", header: "Uploaded", render: (r) => formatDateTime(r.uploadedAt) },
        { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
        { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
      ]}
      searchPlaceholder="Search documents"
      searchFn={(r, q) => `${r.name} ${r.category} ${r.entity}`.toLowerCase().includes(q)}
      filters={[
        { label: "KYC", value: "KYC", predicate: (r) => r.category === "KYC" },
        { label: "GST", value: "GST", predicate: (r) => r.category === "GST" },
        { label: "Invoices", value: "Invoices", predicate: (r) => r.category === "Invoices" },
        { label: "E-way Bills", value: "E-way Bills", predicate: (r) => r.category === "E-way Bills" },
      ]}
      emptyTitle="No documents found."
      emptyDescription="Uploaded KYC and commercial documents will appear here."
      exportName="documents"
      exportRow={(r) => ({ name: r.name, category: r.category, status: r.status, source: r.source })}
      drawerTitle={(r) => r.name}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Category" value={r.category} />
          <DetailRow label="Entity" value={r.entity} />
          <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
        </dl>
      )}
      drawerFooter={(r) => (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => toast.message("Preview opened (mock)")}>View</Button>
          <Button size="sm" variant="outline" onClick={() => toast.success("Download started (mock file)")}>Download</Button>
          <Button size="sm" onClick={() => { updateDocument(r.id, { status: "Verified" }); pushAudit({ admin: user?.name ?? "Admin", role: user?.role ?? "ADMIN", action: `Verified ${r.name}`, module: "Documents", entity: r.id, result: "Success" }); toast.success("Verified"); }}>Verify</Button>
          <Button size="sm" variant="destructive" onClick={() => { updateDocument(r.id, { status: "Rejected" }); toast.success("Rejected"); }}>Reject</Button>
          <Button size="sm" variant="outline" className="col-span-2" onClick={() => { updateDocument(r.id, { status: "Revision Requested" }); toast.success("New version requested"); }}>Request New Version</Button>
        </div>
      )}
    />
  );
}
