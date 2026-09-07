"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type { AdminRole, EntityStatus } from "@/types";

export default function UsersPage() {
  const rows = useDataStore((s) => s.users);
  const updateUser = useDataStore((s) => s.updateUser);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [action, setAction] = useState<{ id: string; type: "deactivate" | "activate" | "reset" | "role" } | null>(null);

  return (
    <>
      <EntityWorkbench
        title="Users"
        description="Accounts across Customer App, Customer Web, Seller App, Seller Web and Admin Portal."
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "id", header: "User ID", sortable: true, accessor: (r) => r.id },
          { key: "name", header: "Name", sortable: true, accessor: (r) => r.name },
          { key: "email", header: "Email", accessor: (r) => r.email },
          { key: "role", header: "Role", accessor: (r) => r.role },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "last", header: "Last Active", sortable: true, accessor: (r) => r.lastActive, render: (r) => formatDate(r.lastActive) },
          { key: "created", header: "Created", sortable: true, accessor: (r) => r.createdAt, render: (r) => formatDate(r.createdAt) },
        ]}
        searchPlaceholder="Search users"
        searchFn={(r, q) => `${r.id} ${r.name} ${r.email} ${r.role}`.toLowerCase().includes(q)}
        emptyTitle="No users found."
        emptyDescription="Users from all five PetroTrade applications appear here."
        exportName="users"
        exportRow={(r) => ({ id: r.id, name: r.name, role: r.role, status: r.status })}
        drawerTitle={(r) => r.name}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Email" value={r.email} />
            <DetailRow label="Role" value={r.role} />
            <DetailRow label="Status" value={<StatusBadge value={r.status} />} />
          </dl>
        )}
        drawerFooter={(r) => (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => setAction({ id: r.id, type: r.status === "Active" ? "deactivate" : "activate" })}>
              {r.status === "Active" ? "Deactivate" : "Activate"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAction({ id: r.id, type: "reset" })}>Reset Access</Button>
            <Button size="sm" variant="outline" className="col-span-2" onClick={() => setAction({ id: r.id, type: "role" })}>
              Change Role
            </Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(action)}
        onOpenChange={(open) => !open && setAction(null)}
        title={
          action?.type === "deactivate"
            ? "Deactivate user"
            : action?.type === "activate"
              ? "Activate user"
              : action?.type === "reset"
                ? "Reset access"
                : "Change role"
        }
        description="This Admin action is recorded in the audit log."
        destructive={action?.type === "deactivate"}
        onConfirm={() => {
          if (!action) return;
          const patch =
            action.type === "deactivate"
              ? { status: "Inactive" as EntityStatus }
              : action.type === "activate"
                ? { status: "Active" as EntityStatus }
                : action.type === "role"
                  ? { role: "SUPPORT" }
                  : {};
          updateUser(action.id, patch);
          pushAudit({
            admin: user?.name ?? "Admin",
            role: (user?.role ?? "ADMIN") as AdminRole,
            action: `${action.type} user ${action.id}`,
            module: "Users",
            entity: action.id,
            result: "Success",
          });
          toast.success("User record updated");
          setAction(null);
        }}
      />
    </>
  );
}
