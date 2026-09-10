"use client";

import { Bell, Download, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PushBulkBar } from "@/components/push-notifications/push-bulk-bar";
import { PushDetailsDrawer } from "@/components/push-notifications/push-details-drawer";
import { PushFilters } from "@/components/push-notifications/push-filters";
import { PushForm } from "@/components/push-notifications/push-form";
import { PushKpiCards } from "@/components/push-notifications/push-kpi-cards";
import { PushPreviewSheet } from "@/components/push-notifications/push-preview-sheet";
import { PushTable } from "@/components/push-notifications/push-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState, KpiSkeleton, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/format";
import {
  audienceLabel,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  formValuesToPush,
  matchesPushFilters,
  PLATFORM_LABELS,
  sortPushes,
  STATUS_LABELS,
} from "@/lib/push-notification-utils";
import { hasPushPermission, PUSH_PERMISSIONS } from "@/lib/push-permissions";
import { useAuthStore } from "@/store/auth-store";
import { usePushNotificationStore } from "@/store/push-notification-store";
import type { PushNotification, PushNotificationInput } from "@/types/push-notification";

export function PushMasterPage() {
  const role = useAuthStore((s) => s.user?.role);
  const notifications = usePushNotificationStore((s) => s.notifications);
  const filters = usePushNotificationStore((s) => s.filters);
  const loadStatus = usePushNotificationStore((s) => s.loadStatus);
  const selectedIds = usePushNotificationStore((s) => s.selectedIds);
  const selectedId = usePushNotificationStore((s) => s.selectedId);
  const isCreateOpen = usePushNotificationStore((s) => s.isCreateOpen);
  const isEditOpen = usePushNotificationStore((s) => s.isEditOpen);
  const isPreviewOpen = usePushNotificationStore((s) => s.isPreviewOpen);
  const isDetailsOpen = usePushNotificationStore((s) => s.isDetailsOpen);
  const previewId = usePushNotificationStore((s) => s.previewId);
  const fetchPushes = usePushNotificationStore((s) => s.fetchPushes);
  const addPush = usePushNotificationStore((s) => s.addPush);
  const savePush = usePushNotificationStore((s) => s.savePush);
  const sendNow = usePushNotificationStore((s) => s.sendNow);
  const cancelScheduled = usePushNotificationStore((s) => s.cancelScheduled);
  const deletePush = usePushNotificationStore((s) => s.deletePush);
  const duplicatePush = usePushNotificationStore((s) => s.duplicatePush);
  const bulkDelete = usePushNotificationStore((s) => s.bulkDelete);
  const bulkSend = usePushNotificationStore((s) => s.bulkSend);
  const bulkCancel = usePushNotificationStore((s) => s.bulkCancel);
  const toggleSelection = usePushNotificationStore((s) => s.toggleSelection);
  const setSelectedIds = usePushNotificationStore((s) => s.setSelectedIds);
  const clearSelection = usePushNotificationStore((s) => s.clearSelection);
  const setSelected = usePushNotificationStore((s) => s.setSelected);
  const setCreateOpen = usePushNotificationStore((s) => s.setCreateOpen);
  const setEditOpen = usePushNotificationStore((s) => s.setEditOpen);
  const setPreviewOpen = usePushNotificationStore((s) => s.setPreviewOpen);
  const setDetailsOpen = usePushNotificationStore((s) => s.setDetailsOpen);

  const [pendingDelete, setPendingDelete] = useState<PushNotification | null>(null);
  const [pendingSend, setPendingSend] = useState<PushNotification | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [pendingBulkSend, setPendingBulkSend] = useState(false);
  const [draftPreview, setDraftPreview] = useState<PushNotification | null>(null);

  useEffect(() => {
    void fetchPushes();
  }, [fetchPushes]);

  const canView = hasPushPermission(role, PUSH_PERMISSIONS.view);
  const canCreate = hasPushPermission(role, PUSH_PERMISSIONS.create);
  const canSend = hasPushPermission(role, PUSH_PERMISSIONS.send);
  const canExport = hasPushPermission(role, PUSH_PERMISSIONS.export);
  const canDelete = hasPushPermission(role, PUSH_PERMISSIONS.delete);

  const rows = useMemo(
    () => sortPushes(notifications.filter((item) => matchesPushFilters(item, filters))),
    [notifications, filters],
  );
  const selected = notifications.find((item) => item.id === selectedId) ?? null;
  const previewSource =
    draftPreview ?? notifications.find((item) => item.id === previewId) ?? selected;
  const editing = notifications.find((item) => item.id === selectedId) ?? null;
  const hasFilters = Boolean(
    filters.search ||
      filters.platform !== "ALL" ||
      filters.audience !== "ALL" ||
      filters.status !== "ALL" ||
      filters.category !== "ALL" ||
      filters.dateFrom ||
      filters.dateTo,
  );

  function exportRows(items: PushNotification[]) {
    downloadCsv(
      "push-notifications.csv",
      items.map((item) => ({
        id: item.id,
        name: item.name,
        title: item.title,
        platforms: item.platforms.map((p) => PLATFORM_LABELS[p]).join(" | "),
        channels: item.channels.map((c) => CHANNEL_LABELS[c]).join(" | "),
        audience: audienceLabel(item),
        category: CATEGORY_LABELS[item.category],
        status: STATUS_LABELS[item.status],
        targeted: item.targeted,
        delivered: item.delivered,
        opened: item.opened,
        sentAt: item.sentAt ?? "",
      })),
    );
    toast.success("Push notification export downloaded.");
  }

  async function handleCreate(values: PushNotificationInput, action: "draft" | "schedule" | "send") {
    const created = await addPush(values, action);
    toast.success(
      action === "draft"
        ? "Notification saved as draft."
        : action === "schedule"
          ? "Notification scheduled."
          : `Notification sent to ${formatNumber(created.delivered)} devices.`,
    );
    setSelected(created.id);
  }

  async function handleUpdate(values: PushNotificationInput, action: "draft" | "schedule" | "send") {
    if (!editing) return;
    const updated = await savePush(editing.id, values, action);
    toast.success(
      action === "draft"
        ? "Notification saved as draft."
        : action === "schedule"
          ? "Notification scheduled."
          : `Notification sent to ${formatNumber(updated.delivered)} devices.`,
    );
  }

  if (!canView) {
    return <EmptyState title="You do not have access to Push Notifications." />;
  }

  if (loadStatus === "loading" && notifications.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Push Notifications"
          description="Send notifications to Customer and Seller App / Web."
        />
        <KpiSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (loadStatus === "error" && notifications.length === 0) {
    return <ErrorState title="Unable to load push notifications." onRetry={() => void fetchPushes()} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Push Notifications"
        description="Compose and send notifications to Customer App, Customer Web, Seller App and Seller Web."
        breadcrumbs={[{ label: "Content Management" }, { label: "Push Notifications" }]}
        actions={
          <>
            {canCreate ? (
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" />
                Compose
              </Button>
            ) : null}
            {canExport ? (
              <Button type="button" size="sm" variant="outline" onClick={() => exportRows(rows)}>
                <Download className="size-3.5" />
                Export
              </Button>
            ) : null}
          </>
        }
      />

      <PushKpiCards />
      <PushFilters />
      <PushBulkBar
        count={selectedIds.length}
        onSend={() => setPendingBulkSend(true)}
        onCancel={() => {
          void bulkCancel().then(() => toast.success("Selected scheduled notifications cancelled."));
        }}
        onDelete={() => setPendingBulkDelete(true)}
        onExport={() => exportRows(notifications.filter((item) => selectedIds.includes(item.id)))}
        onClear={clearSelection}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={hasFilters ? "No notifications match your current filters." : "No push notifications yet."}
          description={
            hasFilters
              ? "Try changing search or filters to see more campaigns."
              : "Compose a notification to send to Customer and Seller App / Web."
          }
          action={
            hasFilters || !canCreate ? null : (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                Compose notification
              </Button>
            )
          }
        />
      ) : (
        <PushTable
          rows={rows}
          selectedIds={selectedIds}
          onToggle={toggleSelection}
          onToggleAll={setSelectedIds}
          onView={(item) => {
            setSelected(item.id);
            setDetailsOpen(true);
          }}
          onEdit={(item) => {
            setSelected(item.id);
            setEditOpen(true);
          }}
          onPreview={(item) => {
            setDraftPreview(null);
            setSelected(item.id);
            setPreviewOpen(true, item.id);
          }}
          onDuplicate={(item) => {
            void duplicatePush(item.id).then(() => toast.success("Notification duplicated as a draft."));
          }}
          onSend={(item) => setPendingSend(item)}
          onCancel={(item) => {
            void cancelScheduled(item.id).then(() => toast.success("Scheduled notification cancelled."));
          }}
          onDelete={setPendingDelete}
        />
      )}

      <PushForm
        open={isCreateOpen}
        mode="create"
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
        onPreview={(values) => {
          setDraftPreview(formValuesToPush(values));
          setPreviewOpen(true);
        }}
      />
      <PushForm
        open={isEditOpen}
        mode="edit"
        notification={editing}
        onOpenChange={setEditOpen}
        onSave={handleUpdate}
        onPreview={(values) => {
          setDraftPreview(formValuesToPush(values, editing));
          setPreviewOpen(true);
        }}
      />
      <PushPreviewSheet
        open={isPreviewOpen}
        notification={previewSource}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setDraftPreview(null);
        }}
      />
      <PushDetailsDrawer
        notification={selected}
        open={isDetailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={(item) => {
          setDetailsOpen(false);
          setSelected(item.id);
          setEditOpen(true);
        }}
        onPreview={(item) => {
          setDraftPreview(null);
          setPreviewOpen(true, item.id);
        }}
        onSend={canSend ? (item) => setPendingSend(item) : undefined}
      />
      <ConfirmDialog
        open={Boolean(pendingSend)}
        onOpenChange={(open) => !open && setPendingSend(null)}
        title="Send this notification now?"
        description="Customer and Seller App / Web inboxes will receive this message immediately."
        confirmLabel="Send now"
        onConfirm={() => {
          if (!pendingSend) return;
          void sendNow(pendingSend.id).then((sent) => {
            toast.success(`Sent to ${formatNumber(sent.delivered)} devices.`);
            setPendingSend(null);
          });
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete) && canDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete notification?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!pendingDelete) return;
          void deletePush(pendingDelete.id).then(() => {
            toast.success("Notification deleted.");
            setPendingDelete(null);
          });
        }}
      />
      <ConfirmDialog
        open={pendingBulkDelete}
        onOpenChange={setPendingBulkDelete}
        title="Delete selected notifications?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          void bulkDelete().then(() => {
            toast.success("Selected notifications deleted.");
            setPendingBulkDelete(false);
          });
        }}
      />
      <ConfirmDialog
        open={pendingBulkSend}
        onOpenChange={setPendingBulkSend}
        title="Send selected notifications now?"
        description="Draft and scheduled items will be delivered to Customer and Seller App / Web."
        confirmLabel="Send now"
        onConfirm={() => {
          void bulkSend().then(() => {
            toast.success("Selected notifications sent.");
            setPendingBulkSend(false);
          });
        }}
      />
    </div>
  );
}
