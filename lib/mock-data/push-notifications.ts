import type { PushNotification } from "@/types/push-notification";

/**
 * Production push inbox starts empty.
 * The previous PSH-2401–PSH-2408 fixtures (Monsoon bulk rates, August GST
 * invoices, Navratri 22 Sept, and the other demo campaigns) were in-memory
 * sample data. They were served to customer and seller apps and the Navratri
 * row was auto-promoted to "sent" with the current timestamp.
 */
export const pushNotifications: PushNotification[] = [];

export const SAMPLE_PUSH_IDS = new Set([
  "PSH-2401",
  "PSH-2402",
  "PSH-2403",
  "PSH-2404",
  "PSH-2405",
  "PSH-2406",
  "PSH-2407",
  "PSH-2408",
]);

const SAMPLE_TITLE =
  /monsoon bulk rates|gst invoices for august|navratri procurement window opens 22 sept/i;

export function isSamplePush(item: { id?: string; title?: string }): boolean {
  if (item.id && SAMPLE_PUSH_IDS.has(item.id)) return true;
  return SAMPLE_TITLE.test(item.title ?? "");
}
