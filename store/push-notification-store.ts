"use client";

import { create } from "zustand";

import * as pushApi from "@/lib/api/push-notifications";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type {
  PushAuditEvent,
  PushFilters,
  PushNotification,
  PushNotificationInput,
  PushSaveAction,
} from "@/types/push-notification";
import { EMPTY_PUSH_FILTERS } from "@/types/push-notification";

type LoadStatus = "idle" | "loading" | "success" | "error";

interface PushState {
  notifications: PushNotification[];
  auditEvents: PushAuditEvent[];
  loadStatus: LoadStatus;
  loadError: string | null;
  selectedId: string | null;
  selectedIds: string[];
  filters: PushFilters;
  isCreateOpen: boolean;
  isEditOpen: boolean;
  isPreviewOpen: boolean;
  isDetailsOpen: boolean;
  previewId: string | null;

  fetchPushes: () => Promise<void>;
  addPush: (input: PushNotificationInput, action: PushSaveAction) => Promise<PushNotification>;
  savePush: (id: string, input: PushNotificationInput, action: PushSaveAction) => Promise<PushNotification>;
  sendNow: (id: string) => Promise<PushNotification>;
  cancelScheduled: (id: string) => Promise<PushNotification>;
  deletePush: (id: string) => Promise<void>;
  duplicatePush: (id: string) => Promise<PushNotification>;
  bulkDelete: (ids?: string[]) => Promise<void>;
  bulkSend: (ids?: string[]) => Promise<void>;
  bulkCancel: (ids?: string[]) => Promise<void>;

  setSelected: (id: string | null) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<PushFilters>) => void;
  clearFilters: () => void;
  setCreateOpen: (open: boolean) => void;
  setEditOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean, id?: string | null) => void;
  setDetailsOpen: (open: boolean) => void;
}

function actor() {
  return useAuthStore.getState().user?.name ?? "Admin";
}

function role() {
  return useAuthStore.getState().user?.role ?? "ADMIN";
}

function pushPlatformAudit(action: string, entityId: string) {
  useDataStore.getState().pushAudit({
    admin: actor(),
    role: role(),
    action,
    module: "Push Notifications",
    entity: entityId,
    result: "Success",
  });
}

function pushInbox(title: string, body: string) {
  useDataStore.getState().pushNotification({
    type: "Content",
    title,
    body,
    href: "/content/push-notifications",
    source: "Admin Portal",
  });
}

async function publishToApps(item: PushNotification) {
  if (item.status !== "SENT") return;
  try {
    await fetch("/api/push-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  } catch {
    // Apps poll the admin API; local campaign state still updates if publish fails.
  }
}

function recordEvent(set: (fn: (s: PushState) => Partial<PushState>) => void, action: string, entityId: string) {
  const event: PushAuditEvent = {
    id: `PAUD-${Date.now()}`,
    action,
    entityType: "PUSH_NOTIFICATION",
    entityId,
    performedBy: actor(),
    timestamp: new Date().toISOString(),
  };
  set((s) => ({ auditEvents: [event, ...s.auditEvents] }));
  pushPlatformAudit(action, entityId);
}

export const usePushNotificationStore = create<PushState>((set, get) => ({
  notifications: pushApi.getPushesSync(),
  auditEvents: [],
  loadStatus: "success",
  loadError: null,
  selectedId: null,
  selectedIds: [],
  filters: { ...EMPTY_PUSH_FILTERS },
  isCreateOpen: false,
  isEditOpen: false,
  isPreviewOpen: false,
  isDetailsOpen: false,
  previewId: null,

  fetchPushes: async () => {
    if (get().notifications.length === 0) set({ loadStatus: "loading", loadError: null });
    else set({ loadError: null });
    try {
      const notifications = await pushApi.getPushes();
      set({ notifications, loadStatus: "success" });
    } catch {
      set({ loadStatus: "error", loadError: "Unable to load push notifications." });
    }
  },

  addPush: async (input, action) => {
    const created = await pushApi.createPush(input, actor(), action);
    set((s) => ({ notifications: [created, ...s.notifications], isCreateOpen: false }));
    const verb = action === "draft" ? "saved as draft" : action === "schedule" ? "scheduled" : "sent";
    recordEvent(set, `Admin ${verb} push ${created.title}`, created.id);
    pushInbox(`Push notification ${verb}`, `${created.title} was ${verb} to ${created.platforms.join(", ")}.`);
    await publishToApps(created);
    return created;
  },

  savePush: async (id, input, action) => {
    const updated = await pushApi.savePush(id, input, action, actor());
    set((s) => ({
      notifications: s.notifications.map((item) => (item.id === id ? updated : item)),
      isEditOpen: false,
    }));
    const verb = action === "draft" ? "saved as draft" : action === "schedule" ? "scheduled" : "sent";
    recordEvent(set, `Admin ${verb} push ${updated.title}`, id);
    pushInbox(`Push notification ${verb}`, `${updated.title} was ${verb}.`);
    await publishToApps(updated);
    return updated;
  },

  sendNow: async (id) => {
    const updated = await pushApi.sendPush(id);
    set((s) => ({ notifications: s.notifications.map((item) => (item.id === id ? updated : item)) }));
    recordEvent(set, `Admin sent push ${updated.title}`, id);
    pushInbox("Push notification sent", `${updated.title} was delivered to Customer / Seller apps.`);
    await publishToApps(updated);
    return updated;
  },

  cancelScheduled: async (id) => {
    const updated = await pushApi.cancelPush(id);
    set((s) => ({ notifications: s.notifications.map((item) => (item.id === id ? updated : item)) }));
    recordEvent(set, `Admin cancelled push ${updated.title}`, id);
    pushInbox("Push notification cancelled", `${updated.title} will not be delivered.`);
    return updated;
  },

  deletePush: async (id) => {
    const current = get().notifications.find((item) => item.id === id);
    await pushApi.deletePush(id);
    set((s) => ({
      notifications: s.notifications.filter((item) => item.id !== id),
      selectedIds: s.selectedIds.filter((item) => item !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      isDetailsOpen: s.selectedId === id ? false : s.isDetailsOpen,
    }));
    recordEvent(set, `Admin deleted push ${current?.title ?? id}`, id);
    pushInbox("Push notification deleted", `${current?.title ?? id} was removed.`);
  },

  duplicatePush: async (id) => {
    const created = await pushApi.duplicatePush(id, actor());
    set((s) => ({ notifications: [created, ...s.notifications] }));
    recordEvent(set, `Admin duplicated push ${created.title}`, created.id);
    pushInbox("Push notification duplicated", `${created.title} was created as a draft.`);
    return created;
  },

  bulkDelete: async (ids) => {
    const target = ids ?? get().selectedIds;
    await pushApi.bulkDelete(target);
    set((s) => ({
      notifications: s.notifications.filter((item) => !target.includes(item.id)),
      selectedIds: [],
    }));
    recordEvent(set, `Admin bulk deleted ${target.length} push notifications`, target[0] ?? "PUSH");
    pushInbox("Push notifications deleted", `${target.length} notifications were removed.`);
  },

  bulkSend: async (ids) => {
    const target = ids ?? get().selectedIds;
    const updated = await pushApi.bulkSend(target);
    const map = new Map(updated.map((item) => [item.id, item]));
    set((s) => ({
      notifications: s.notifications.map((item) => map.get(item.id) ?? item),
      selectedIds: [],
    }));
    recordEvent(set, `Admin bulk sent ${updated.length} push notifications`, target[0] ?? "PUSH");
    pushInbox("Push notifications sent", `${updated.length} notifications were delivered.`);
    await Promise.all(updated.map((item) => publishToApps(item)));
  },

  bulkCancel: async (ids) => {
    const target = ids ?? get().selectedIds;
    const updated = await pushApi.bulkCancel(target);
    const map = new Map(updated.map((item) => [item.id, item]));
    set((s) => ({
      notifications: s.notifications.map((item) => map.get(item.id) ?? item),
      selectedIds: [],
    }));
    recordEvent(set, `Admin cancelled ${updated.length} push notifications`, target[0] ?? "PUSH");
    pushInbox("Push notifications cancelled", `${updated.length} scheduled items were cancelled.`);
  },

  setSelected: (id) => set({ selectedId: id }),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  toggleSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((item) => item !== id)
        : [...s.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  clearFilters: () => set({ filters: { ...EMPTY_PUSH_FILTERS } }),
  setCreateOpen: (open) => set({ isCreateOpen: open }),
  setEditOpen: (open) => set({ isEditOpen: open }),
  setPreviewOpen: (open, id) =>
    set({
      isPreviewOpen: open,
      previewId: open ? (id ?? get().selectedId) : null,
    }),
  setDetailsOpen: (open) => set({ isDetailsOpen: open }),
}));
