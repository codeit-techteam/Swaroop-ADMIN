"use client";

import { Bell, CalendarClock, FileText, Send, TriangleAlert } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import { pushKpis } from "@/lib/push-notification-utils";
import { usePushNotificationStore } from "@/store/push-notification-store";
import type { PushStatus } from "@/types/push-notification";

export function PushKpiCards() {
  const notifications = usePushNotificationStore((s) => s.notifications);
  const setFilters = usePushNotificationStore((s) => s.setFilters);
  const kpis = pushKpis(notifications);

  function filterStatus(status: PushStatus | "ALL") {
    setFilters({ status });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Total Campaigns" value={String(kpis.total)} icon={Bell} onClick={() => filterStatus("ALL")} />
      <KpiCard
        label="Sent"
        value={String(kpis.sent)}
        icon={Send}
        tone="success"
        onClick={() => filterStatus("SENT")}
      />
      <KpiCard
        label="Scheduled"
        value={String(kpis.scheduled)}
        icon={CalendarClock}
        onClick={() => filterStatus("SCHEDULED")}
      />
      <KpiCard label="Drafts" value={String(kpis.drafts)} icon={FileText} onClick={() => filterStatus("DRAFT")} />
      <KpiCard
        label="Failed"
        value={String(kpis.failed)}
        icon={TriangleAlert}
        tone="danger"
        onClick={() => filterStatus("FAILED")}
      />
    </div>
  );
}
