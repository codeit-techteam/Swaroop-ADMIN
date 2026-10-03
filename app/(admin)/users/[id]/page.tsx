"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { EditManagerDrawer, type EditSection } from "@/components/users/edit-manager-drawer";
import { OneTimeLinkPanel, humanize } from "@/components/users/manager-fields";
import { ApiError } from "@/lib/api/client";
import {
  getUser,
  postUserAction,
  resetManagerAccess,
  type ManagerDetail,
  type OneTimeLink,
} from "@/lib/api/users";
import { formatDateTime } from "@/lib/format";

type PendingAction = "deactivate" | "activate" | "revoke" | "reset" | "primary";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<ManagerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [running, setRunning] = useState(false);
  const [link, setLink] = useState<(OneTimeLink & { purpose: string }) | null>(null);
  const [editing, setEditing] = useState<EditSection | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getUser(params.id);
      setUser(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "User not found");
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: PendingAction) {
    setRunning(true);
    try {
      if (action === "reset") {
        const result = await resetManagerAccess(params.id);
        setLink(result.data);
        toast.success(
          result.data.purpose === "INVITATION" ? "New invitation link created" : "Password reset link created",
        );
      } else {
        await postUserAction(params.id, action);
        toast.success(SUCCESS[action]);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setRunning(false);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!user) return <p className="text-sm text-slate-500">Loading user…</p>;

  const manager = user.role === "SELLER_MANAGER";
  const neverSetPassword = manager && user.hasPassword === false;

  return (
    <div className="space-y-6">
      <PageHeader
        title={user.name}
        description="Profile, seller assignment, permissions and activity."
        actions={<Button variant="outline" onClick={() => router.push("/users")}>Back to users</Button>}
      />
      <section className="grid gap-4 md:grid-cols-2">
        <Card title="Profile">
          <Line label="Email" value={user.email} />
          <Line label="Phone" value={user.phone} />
          <Line label="Login ID" value={user.loginId} />
          <Line label="Role" value={humanize(user.role)} />
          <Line label="Title" value={user.assignment?.title} />
          <Line
            label="Status"
            value={<StatusBadge value={neverSetPassword && user.status === "PENDING" ? "INVITED" : user.status} />}
          />
        </Card>
        <Card title="Seller assignment">
          <Line label="Seller" value={user.seller?.name} />
          <Line label="Seller ID" value={user.seller?.code || user.seller?.id} />
          <Line label="GST" value={user.seller?.gst} />
          <Line label="Seller status" value={humanize(user.seller?.status)} />
          <Line label="Primary manager" value={user.assignment?.isPrimary ? "Yes" : "No"} />
          <Line label="Assignment" value={humanize(user.assignment?.status)} />
          <Line
            label="Assigned"
            value={user.assignment?.assignedAt ? formatDateTime(user.assignment.assignedAt) : undefined}
          />
        </Card>
        <Card title="Login access">
          <Line label="Last login" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"} />
          <Line label="Sessions issued" value={String(user.loginCount ?? "—")} />
          <Line label="Password set" value={user.hasPassword ? "Yes" : "No — invitation pending"} />
          <Line label="Password change required" value={user.mustChangePassword ? "Yes" : "No"} />
          <Line
            label="Open link"
            value={
              user.pendingLink
                ? `${humanize(user.pendingLink.purpose)} · expires ${formatDateTime(user.pendingLink.expiresAt)}`
                : "None"
            }
          />
          <Line label="Created by" value={user.createdBy?.name} />
          <Line label="Created" value={formatDateTime(user.createdAt)} />
        </Card>
        <Card title="Permissions">
          <div className="flex flex-wrap gap-1">
            {user.permissions?.length
              ? user.permissions.map((code) => (
                  <span key={code} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {code}
                  </span>
                ))
              : "No grants"}
          </div>
        </Card>
      </section>
      {manager ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={running} onClick={() => setEditing("profile")}>
            Edit
          </Button>
          <Button variant="outline" disabled={running} onClick={() => setEditing("permissions")}>
            Change permissions
          </Button>
          <Button variant="outline" disabled={running} onClick={() => setEditing("seller")}>
            Change seller assignment
          </Button>
          <Button
            variant="outline"
            disabled={running}
            onClick={() => setPending(user.status === "ACTIVE" ? "deactivate" : "activate")}
          >
            {user.status === "ACTIVE" ? "Disable" : "Enable"}
          </Button>
          {user.assignment?.status === "ACTIVE" && !user.assignment.isPrimary ? (
            <Button variant="outline" disabled={running} onClick={() => setPending("primary")}>
              Set as primary
            </Button>
          ) : null}
          <Button variant="outline" disabled={running} onClick={() => setPending("reset")}>
            {neverSetPassword ? "Resend invitation" : "Reset password"}
          </Button>
          <Button variant="destructive" disabled={running} onClick={() => setPending("revoke")}>
            Revoke access
          </Button>
        </div>
      ) : null}
      {link ? (
        <OneTimeLinkPanel
          link={link}
          title={link.purpose === "INVITATION" ? "New invitation link (not sent automatically)" : "Password reset link (not sent automatically)"}
        />
      ) : null}
      <Card title="Audit history">
        <ul className="space-y-2 text-sm">
          {user.activity?.length ? (
            user.activity.map((event) => (
              <li key={event.id} className="flex justify-between gap-4 border-b py-2">
                <span>
                  {humanize(event.action)}
                  {event.actorName ? <span className="text-slate-500"> · by {event.actorName}</span> : null}
                </span>
                <span className="text-slate-500">{formatDateTime(event.createdAt)}</span>
              </li>
            ))
          ) : (
            <li className="text-slate-500">No activity recorded yet.</li>
          )}
        </ul>
      </Card>
      {manager ? (
        <EditManagerDrawer
          manager={user}
          section={editing}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={setUser}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? CONFIRM_TITLES[pending] : ""}
        description={
          pending === "reset"
            ? "Earlier links stop working and existing sessions are signed out. This action is audited."
            : "This action is audited. Disable and revoke sign the manager out immediately."
        }
        destructive={pending === "revoke" || pending === "deactivate"}
        onConfirm={() => {
          if (!pending) return;
          const action = pending;
          setPending(null);
          void run(action);
        }}
      />
    </div>
  );
}

const SUCCESS: Record<Exclude<PendingAction, "reset">, string> = {
  activate: "Manager enabled",
  deactivate: "Manager disabled and signed out",
  revoke: "Access revoked and manager signed out",
  primary: "Primary manager updated",
};

const CONFIRM_TITLES: Record<PendingAction, string> = {
  activate: "Enable manager",
  deactivate: "Disable manager",
  revoke: "Revoke access",
  reset: "Issue a new access link",
  primary: "Set primary manager",
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right">{value || "—"}</span>
    </div>
  );
}
