"use client";

import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS, permissionLabels } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const auditLogs = useDataStore((s) => s.auditLogs);
  const logs = auditLogs.slice(0, 6);
  if (!user) return null;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Profile" description="Admin identity, role and session context." />
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border bg-white p-4">
          <p className="section-label mb-3">Identity</p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt><dd className="font-medium">{user.name}</dd>
            <dt className="text-muted-foreground">Email</dt><dd className="font-medium">{user.email}</dd>
            <dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{user.phone}</dd>
            <dt className="text-muted-foreground">Role</dt><dd className="font-medium">{ROLE_LABELS[user.role]}</dd>
            <dt className="text-muted-foreground">Department</dt><dd className="font-medium">{user.department}</dd>
            <dt className="text-muted-foreground">Last login</dt><dd className="font-medium">{formatDateTime(user.lastLogin)}</dd>
            <dt className="text-muted-foreground">Session</dt><dd className="font-medium">Active · Admin Portal</dd>
          </dl>
        </div>
        <div className="rounded-md border bg-white p-4">
          <p className="section-label mb-3">Permissions</p>
          <ul className="flex flex-col gap-2">
            {permissionLabels(user.role).map((item) => (
              <li key={item} className="rounded-md border px-3 py-2 text-sm">{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="rounded-md border bg-white p-4">
        <p className="section-label mb-3">Activity history</p>
        <ActivityTimeline
          items={logs.map((log) => ({
            id: log.id,
            title: log.action,
            detail: log.module,
            time: log.timestamp,
            source: "Admin Portal",
          }))}
        />
      </section>
    </div>
  );
}
