"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getUser, postUserAction, type ManagerDetail } from "@/lib/api/users";
import { formatDateTime } from "@/lib/format";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<ManagerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"deactivate" | "activate" | "revoke" | "reset" | "primary" | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

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

  async function run(action: "deactivate" | "activate" | "revoke" | "reset-password" | "primary") {
    try {
      const result = await postUserAction(params.id, action);
      if (action === "reset-password" && result.data.token) {
        setResetToken(result.data.token);
      }
      toast.success("User updated");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!user) return <p className="text-sm text-slate-500">Loading user…</p>;

  const manager = user.role === "SELLER_MANAGER";

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
          <Line label="Role" value={user.role} />
          <Line label="Status" value={<StatusBadge value={user.status} />} />
        </Card>
        <Card title="Seller assignment">
          <Line label="Seller" value={user.seller?.name} />
          <Line label="Seller ID" value={user.seller?.id} />
          <Line label="GST" value={user.seller?.gst} />
          <Line label="PAN" value={user.seller?.pan} />
          <Line label="Primary" value={user.assignment?.isPrimary ? "Yes" : "No"} />
          <Line label="Assignment" value={user.assignment?.status} />
        </Card>
        <Card title="Login">
          <Line label="Last login" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"} />
          <Line label="Login count" value={String(user.loginCount ?? "—")} />
          <Line label="Created" value={formatDateTime(user.createdAt)} />
          <Line label="Password change required" value={user.mustChangePassword ? "Yes" : "No"} />
        </Card>
        <Card title="Permissions">
          <div className="flex flex-wrap gap-1">
            {user.permissions?.length
              ? user.permissions.map((code) => (
                  <span key={code} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {code}
                  </span>
                ))
              : "No extra grants"}
          </div>
        </Card>
      </section>
      {manager ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setPending(user.status === "ACTIVE" ? "deactivate" : "activate")}>
            {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="outline" onClick={() => setPending("primary")}>Set as primary</Button>
          <Button variant="outline" onClick={() => setPending("reset")}>Reset password</Button>
          <Button variant="destructive" onClick={() => setPending("revoke")}>Revoke access</Button>
        </div>
      ) : null}
      {resetToken ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p>Password reset token (shown once):</p>
          <p className="mt-1 break-all font-mono text-xs">{resetToken}</p>
          <p className="mt-2 text-xs">
            Setup path: /accept-invite?token=… on the Seller Web app. Existing sessions were signed out.
          </p>
        </div>
      ) : null}
      <Card title="Activity">
        <ul className="space-y-2 text-sm">
          {user.activity?.length ? (
            user.activity.map((event) => (
              <li key={event.id} className="flex justify-between gap-4 border-b py-2">
                <span>{event.action.replaceAll("_", " ")}</span>
                <span className="text-slate-500">{formatDateTime(event.createdAt)}</span>
              </li>
            ))
          ) : (
            <li className="text-slate-500">No activity recorded yet.</li>
          )}
        </ul>
      </Card>
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending === "revoke"
            ? "Revoke access"
            : pending === "reset"
              ? "Reset password"
              : pending === "primary"
                ? "Set primary manager"
                : pending === "deactivate"
                  ? "Deactivate manager"
                  : "Activate manager"
        }
        description="This action is audited. Deactivate and revoke sign the manager out immediately."
        destructive={pending === "revoke" || pending === "deactivate"}
        onConfirm={() => {
          if (!pending) return;
          const action =
            pending === "reset"
              ? "reset-password"
              : pending === "primary"
                ? "primary"
                : pending;
          setPending(null);
          void run(action);
        }}
      />
    </div>
  );
}

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
