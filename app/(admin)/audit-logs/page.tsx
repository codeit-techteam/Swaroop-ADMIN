"use client";

import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { DetailRow } from "@/components/shared/detail-drawer";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import { useDataStore } from "@/store/data-store";

export default function AuditLogsPage() {
  const rows = useDataStore((s) => s.auditLogs);
  return (
    <EntityWorkbench
      title="Audit Logs"
      description="Every important Admin Portal action is recorded here."
      rows={rows}
      getRowId={(r) => r.id}
      columns={[
        { key: "time", header: "Timestamp", sortable: true, accessor: (r) => r.timestamp, render: (r) => formatDateTime(r.timestamp) },
        { key: "admin", header: "Admin", accessor: (r) => r.admin },
        { key: "role", header: "Role", accessor: (r) => r.role },
        { key: "action", header: "Action", accessor: (r) => r.action },
        { key: "module", header: "Module", accessor: (r) => r.module },
        { key: "entity", header: "Entity", accessor: (r) => r.entity },
        { key: "result", header: "Result", render: (r) => <StatusBadge value={r.result === "Success" ? "Approved" : "Failed"} /> },
      ]}
      searchPlaceholder="Search audit history"
      searchFn={(r, q) => `${r.admin} ${r.action} ${r.module} ${r.entity}`.toLowerCase().includes(q)}
      emptyTitle="No audit events."
      emptyDescription="Admin actions will appear in this mock history."
      exportName="audit-logs"
      exportRow={(r) => ({ timestamp: r.timestamp, admin: r.admin, action: r.action, module: r.module, result: r.result })}
      drawerTitle={(r) => r.action}
      renderDetails={(r) => (
        <dl>
          <DetailRow label="Admin" value={`${r.admin} (${r.role})`} />
          <DetailRow label="Module" value={r.module} />
          <DetailRow label="Entity" value={r.entity} />
          <DetailRow label="Source" value="Admin Portal" />
        </dl>
      )}
    />
  );
}
