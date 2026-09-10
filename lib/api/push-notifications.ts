import {
  estimateReach,
  hasCustomerPlatform,
  hasSellerPlatform,
  scheduleToIso,
  simulateDelivery,
  toPublicPayload,
} from "@/lib/push-notification-utils";
import { pushNotifications as seed } from "@/lib/mock-data/push-notifications";
import { delay } from "@/lib/utils";
import type {
  PushNotification,
  PushNotificationInput,
  PushPublicPayload,
  PushSaveAction,
  PushStatus,
} from "@/types/push-notification";

let records: PushNotification[] = structuredClone(seed);

function nextId() {
  const nums = records
    .map((item) => Number(item.id.replace("PSH-", "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 2400;
  return `PSH-${max + 1}`;
}

function clone(list: PushNotification[]) {
  return structuredClone(list);
}

function applySaveAction(input: PushNotificationInput, action: PushSaveAction): PushNotificationInput {
  if (action === "draft") return { ...input, status: "DRAFT" };
  if (action === "schedule") {
    return {
      ...input,
      status: "SCHEDULED",
      scheduledAt: scheduleToIso(input.scheduledDate, input.scheduledTime),
    };
  }
  return {
    ...input,
    status: "SENT",
    scheduledAt: scheduleToIso(input.scheduledDate, input.scheduledTime),
  };
}

function withDelivery(item: PushNotification, status: PushStatus): PushNotification {
  if (status !== "SENT") {
    return { ...item, status, delivered: 0, opened: 0, failed: 0, sentAt: undefined };
  }
  const stats = simulateDelivery(item.targeted || estimateReach(item));
  return {
    ...item,
    status,
    ...stats,
    sentAt: new Date().toISOString(),
  };
}

function promoteDueScheduled(now = new Date()) {
  records = records.map((item) => {
    if (item.status !== "SCHEDULED") return item;
    const at = item.scheduledAt ? new Date(item.scheduledAt) : null;
    if (!at || Number.isNaN(at.getTime()) || at > now) return item;
    return withDelivery(
      { ...item, targeted: item.targeted || estimateReach(item), updatedAt: now.toISOString() },
      "SENT",
    );
  });
}

export function getPushesSync(): PushNotification[] {
  promoteDueScheduled();
  return clone(records);
}

export async function getPushes(): Promise<PushNotification[]> {
  await delay(280);
  return getPushesSync();
}

export async function getPushById(id: string): Promise<PushNotification | undefined> {
  await delay(120);
  const found = getPushesSync().find((item) => item.id === id);
  return found ? structuredClone(found) : undefined;
}

export async function createPush(input: PushNotificationInput, actor = "Admin", action: PushSaveAction = "draft") {
  await delay(240);
  const now = new Date().toISOString();
  const payload = applySaveAction(input, action);
  const targeted = estimateReach(payload);
  const base: PushNotification = {
    ...payload,
    id: nextId(),
    timezone: "Asia/Kolkata",
    targeted,
    delivered: 0,
    opened: 0,
    failed: 0,
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
  };
  const created = action === "send" ? withDelivery(base, "SENT") : base;
  records = [created, ...records];
  return structuredClone(created);
}

export async function updatePush(id: string, patch: Partial<PushNotification>): Promise<PushNotification> {
  await delay(200);
  const index = records.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Push notification not found");
  const current = records[index]!;
  const next: PushNotification = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  };
  records[index] = next;
  return structuredClone(next);
}

export async function savePush(id: string, input: PushNotificationInput, action: PushSaveAction, actor = "Admin") {
  const payload = applySaveAction(input, action);
  const targeted = estimateReach(payload);
  const current = await getPushById(id);
  if (!current) throw new Error("Push notification not found");
  const merged: PushNotification = {
    ...current,
    ...payload,
    targeted,
    createdBy: current.createdBy || actor,
    updatedAt: new Date().toISOString(),
  };
  const next = action === "send" ? withDelivery(merged, "SENT") : merged;
  return updatePush(id, next);
}

export async function sendPush(id: string): Promise<PushNotification> {
  const current = await getPushById(id);
  if (!current) throw new Error("Push notification not found");
  if (current.status === "CANCELLED") throw new Error("Cancelled notifications cannot be sent.");
  const next = withDelivery({ ...current, targeted: current.targeted || estimateReach(current) }, "SENT");
  return updatePush(id, next);
}

export async function cancelPush(id: string): Promise<PushNotification> {
  const current = await getPushById(id);
  if (!current) throw new Error("Push notification not found");
  if (current.status === "SENT") throw new Error("Sent notifications cannot be cancelled.");
  return updatePush(id, { status: "CANCELLED", delivered: 0, opened: 0, failed: 0 });
}

export async function deletePush(id: string): Promise<void> {
  await delay(160);
  records = records.filter((item) => item.id !== id);
}

export async function duplicatePush(id: string, actor = "Admin"): Promise<PushNotification> {
  const source = await getPushById(id);
  if (!source) throw new Error("Push notification not found");
  const input: PushNotificationInput = {
    name: source.name.endsWith(" - Copy") ? source.name : `${source.name} - Copy`,
    title: source.title,
    body: source.body,
    category: source.category,
    priority: source.priority,
    platforms: [...source.platforms],
    channels: [...source.channels],
    audienceMode: source.audienceMode,
    customerSegments: [...source.customerSegments],
    sellerSegments: [...source.sellerSegments],
    ctaText: source.ctaText,
    ctaAction: source.ctaAction,
    deepLink: source.deepLink,
    imageUrl: source.imageUrl,
    status: "DRAFT",
    timezone: "Asia/Kolkata",
    scheduledDate: source.scheduledDate,
    scheduledTime: source.scheduledTime,
    scheduledAt: undefined,
  };
  return createPush(input, actor, "draft");
}

export async function bulkDelete(ids: string[]): Promise<void> {
  await delay(200);
  const set = new Set(ids);
  records = records.filter((item) => !set.has(item.id));
}

export async function bulkSend(ids: string[]): Promise<PushNotification[]> {
  const updated: PushNotification[] = [];
  for (const id of ids) {
    const current = records.find((item) => item.id === id);
    if (!current || current.status === "SENT" || current.status === "CANCELLED") continue;
    updated.push(await sendPush(id));
  }
  return updated;
}

export async function bulkCancel(ids: string[]): Promise<PushNotification[]> {
  const updated: PushNotification[] = [];
  for (const id of ids) {
    const current = records.find((item) => item.id === id);
    if (!current || current.status === "SENT") continue;
    updated.push(await cancelPush(id));
  }
  return updated;
}

export function getInboxPayloads(audience: "CUSTOMER" | "SELLER"): PushPublicPayload[] {
  promoteDueScheduled();
  return records
    .filter((item) => item.status === "SENT")
    .filter((item) => (audience === "CUSTOMER" ? hasCustomerPlatform(item.platforms) : hasSellerPlatform(item.platforms)))
    .map((item) => toPublicPayload(item, audience));
}

export function upsertSentPush(item: PushNotification): PushNotification {
  const next: PushNotification = {
    ...item,
    status: "SENT",
    sentAt: item.sentAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const index = records.findIndex((row) => row.id === next.id);
  if (index >= 0) records[index] = next;
  else records = [next, ...records];
  return structuredClone(next);
}

export const pushNotificationApi = {
  getPushes,
  getPushesSync,
  getPushById,
  createPush,
  updatePush,
  savePush,
  sendPush,
  cancelPush,
  deletePush,
  duplicatePush,
  bulkDelete,
  bulkSend,
  bulkCancel,
  getInboxPayloads,
  upsertSentPush,
};
