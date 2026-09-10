import type { AppSource } from "@/types";
import type {
  CustomerSegment,
  PushCategory,
  PushChannel,
  PushCtaAction,
  PushFilters,
  PushKpis,
  PushNotification,
  PushNotificationInput,
  PushPlatform,
  PushPriority,
  PushPublicPayload,
  PushStatus,
  SellerSegment,
} from "@/types/push-notification";

export const TIMEZONE = "Asia/Kolkata" as const;

export const PLATFORM_LABELS: Record<PushPlatform, AppSource> = {
  CUSTOMER_APP: "Customer App",
  CUSTOMER_WEB: "Customer Web",
  SELLER_APP: "Seller App",
  SELLER_WEB: "Seller Web",
};

export const CHANNEL_LABELS: Record<PushChannel, string> = {
  PUSH: "Push",
  IN_APP: "In-app",
};

export const STATUS_LABELS: Record<PushStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENT: "Sent",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const PRIORITY_LABELS: Record<PushPriority, string> = {
  HIGH: "High",
  NORMAL: "Normal",
  LOW: "Low",
};

export const CATEGORY_LABELS: Record<PushCategory, string> = {
  ANNOUNCEMENT: "Announcement",
  PROMOTION: "Promotion",
  OFFER: "Offer",
  ORDER: "Order",
  PAYMENT: "Payment",
  DOCUMENT: "Document",
  KYC: "KYC",
  SYSTEM: "System",
};

export const CTA_LABELS: Record<PushCtaAction, string> = {
  NO_ACTION: "No action",
  OPEN_DASHBOARD: "Open Dashboard",
  OPEN_MARKETPLACE: "Open Marketplace",
  OPEN_ORDERS: "Open Orders",
  OPEN_OFFERS: "Open Offers",
  OPEN_PAYMENTS: "Open Payments",
  OPEN_DOCUMENTS: "Open Documents",
  OPEN_CREDIT: "Open Credit",
  OPEN_DISPATCH: "Open Dispatch",
  OPEN_SETTLEMENTS: "Open Settlements",
  OPEN_REQUESTS: "Open Purchase Requests",
  OPEN_PRODUCTS: "Open Products",
  OPEN_SUPPORT: "Open Support",
};

export const CUSTOMER_SEGMENTS: { id: CustomerSegment; label: string; reach: number }[] = [
  { id: "ALL_CUSTOMERS", label: "All Customers", reach: 1842 },
  { id: "NEW_CUSTOMERS", label: "New Customers", reach: 214 },
  { id: "EXISTING_CUSTOMERS", label: "Existing Customers", reach: 1628 },
  { id: "HIGH_VALUE_CUSTOMERS", label: "High Value Customers", reach: 186 },
  { id: "BUSINESS_CUSTOMERS", label: "Business Customers", reach: 974 },
];

export const SELLER_SEGMENTS: { id: SellerSegment; label: string; reach: number }[] = [
  { id: "ALL_SELLERS", label: "All Sellers", reach: 486 },
  { id: "NEW_SELLERS", label: "New Sellers", reach: 58 },
  { id: "VERIFIED_SELLERS", label: "Verified Sellers", reach: 312 },
  { id: "HIGH_PERFORMING_SELLERS", label: "High Performing Sellers", reach: 94 },
  { id: "SELLERS_WITH_ACTIVE_OFFERS", label: "Sellers with Active Offers", reach: 167 },
];

const CUSTOMER_REACH = Object.fromEntries(CUSTOMER_SEGMENTS.map((item) => [item.id, item.reach])) as Record<
  CustomerSegment,
  number
>;
const SELLER_REACH = Object.fromEntries(SELLER_SEGMENTS.map((item) => [item.id, item.reach])) as Record<
  SellerSegment,
  number
>;

export const CUSTOMER_CTA_ACTIONS: PushCtaAction[] = [
  "NO_ACTION",
  "OPEN_DASHBOARD",
  "OPEN_MARKETPLACE",
  "OPEN_ORDERS",
  "OPEN_OFFERS",
  "OPEN_PAYMENTS",
  "OPEN_DOCUMENTS",
  "OPEN_CREDIT",
  "OPEN_SUPPORT",
];

export const SELLER_CTA_ACTIONS: PushCtaAction[] = [
  "NO_ACTION",
  "OPEN_DASHBOARD",
  "OPEN_PRODUCTS",
  "OPEN_OFFERS",
  "OPEN_ORDERS",
  "OPEN_DISPATCH",
  "OPEN_SETTLEMENTS",
  "OPEN_REQUESTS",
  "OPEN_DOCUMENTS",
  "OPEN_SUPPORT",
];

export const CUSTOMER_DEEP_LINKS: Record<PushCtaAction, string> = {
  NO_ACTION: "/dashboard",
  OPEN_DASHBOARD: "/dashboard",
  OPEN_MARKETPLACE: "/marketplace",
  OPEN_ORDERS: "/orders",
  OPEN_OFFERS: "/marketplace",
  OPEN_PAYMENTS: "/payments",
  OPEN_DOCUMENTS: "/documents",
  OPEN_CREDIT: "/payments/credit",
  OPEN_DISPATCH: "/dashboard",
  OPEN_SETTLEMENTS: "/dashboard",
  OPEN_REQUESTS: "/purchase-requests",
  OPEN_PRODUCTS: "/marketplace",
  OPEN_SUPPORT: "/support",
};

export const SELLER_DEEP_LINKS: Record<PushCtaAction, string> = {
  NO_ACTION: "/dashboard",
  OPEN_DASHBOARD: "/dashboard",
  OPEN_MARKETPLACE: "/products",
  OPEN_ORDERS: "/orders",
  OPEN_OFFERS: "/offers",
  OPEN_PAYMENTS: "/payments",
  OPEN_DOCUMENTS: "/documents",
  OPEN_CREDIT: "/dashboard",
  OPEN_DISPATCH: "/dispatch",
  OPEN_SETTLEMENTS: "/settlements",
  OPEN_REQUESTS: "/purchase-requests",
  OPEN_PRODUCTS: "/products",
  OPEN_SUPPORT: "/support",
};

export function hasCustomerPlatform(platforms: PushPlatform[]) {
  return platforms.some((p) => p === "CUSTOMER_APP" || p === "CUSTOMER_WEB");
}

export function hasSellerPlatform(platforms: PushPlatform[]) {
  return platforms.some((p) => p === "SELLER_APP" || p === "SELLER_WEB");
}

export function audienceLabel(item: PushNotification) {
  const parts: string[] = [];
  if (hasCustomerPlatform(item.platforms)) {
    if (item.audienceMode === "ALL" || item.customerSegments.includes("ALL_CUSTOMERS") || item.customerSegments.length === 0) {
      parts.push("All Customers");
    } else {
      parts.push(item.customerSegments.map((id) => CUSTOMER_SEGMENTS.find((s) => s.id === id)?.label ?? id).join(", "));
    }
  }
  if (hasSellerPlatform(item.platforms)) {
    if (item.audienceMode === "ALL" || item.sellerSegments.includes("ALL_SELLERS") || item.sellerSegments.length === 0) {
      parts.push("All Sellers");
    } else {
      parts.push(item.sellerSegments.map((id) => SELLER_SEGMENTS.find((s) => s.id === id)?.label ?? id).join(", "));
    }
  }
  return parts.join(" · ") || "No audience";
}

export function estimateReach(item: Pick<PushNotification, "platforms" | "audienceMode" | "customerSegments" | "sellerSegments">) {
  let total = 0;
  if (hasCustomerPlatform(item.platforms)) {
    if (item.audienceMode === "ALL" || item.customerSegments.length === 0) {
      total += CUSTOMER_REACH.ALL_CUSTOMERS;
    } else {
      total += Math.max(...item.customerSegments.map((id) => CUSTOMER_REACH[id] ?? 0), 0);
    }
  }
  if (hasSellerPlatform(item.platforms)) {
    if (item.audienceMode === "ALL" || item.sellerSegments.length === 0) {
      total += SELLER_REACH.ALL_SELLERS;
    } else {
      total += Math.max(...item.sellerSegments.map((id) => SELLER_REACH[id] ?? 0), 0);
    }
  }
  return total;
}

export function simulateDelivery(targeted: number) {
  const delivered = Math.max(0, Math.round(targeted * 0.94));
  const failed = Math.max(0, targeted - delivered);
  const opened = Math.round(delivered * 0.21);
  return { targeted, delivered, opened, failed };
}

export function parseSchedule(date: string, time: string) {
  const safeTime = time || "09:00";
  return new Date(`${date}T${safeTime}:00+05:30`);
}

export function scheduleToIso(date: string, time: string) {
  const parsed = parseSchedule(date, time);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function resolveDeepLink(item: Pick<PushNotification, "ctaAction" | "deepLink" | "platforms">, audience: "CUSTOMER" | "SELLER") {
  if (item.deepLink?.trim()) return item.deepLink.trim();
  return audience === "CUSTOMER" ? CUSTOMER_DEEP_LINKS[item.ctaAction] : SELLER_DEEP_LINKS[item.ctaAction];
}

export function toPublicPayload(item: PushNotification, audience: "CUSTOMER" | "SELLER"): PushPublicPayload {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    category: item.category,
    priority: item.priority,
    platforms: item.platforms.filter((platform) =>
      audience === "CUSTOMER" ? platform.startsWith("CUSTOMER") : platform.startsWith("SELLER"),
    ),
    channels: item.channels,
    ctaText: item.ctaText,
    ctaAction: item.ctaAction,
    deepLink: resolveDeepLink(item, audience),
    imageUrl: item.imageUrl,
    sentAt: item.sentAt ?? item.updatedAt,
    audience,
  };
}

export function pushKpis(items: PushNotification[]): PushKpis {
  return {
    total: items.length,
    sent: items.filter((item) => item.status === "SENT").length,
    scheduled: items.filter((item) => item.status === "SCHEDULED").length,
    drafts: items.filter((item) => item.status === "DRAFT").length,
    failed: items.filter((item) => item.status === "FAILED").length,
  };
}

export function matchesPushFilters(item: PushNotification, filters: PushFilters) {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      item.id,
      item.name,
      item.title,
      item.body,
      item.platforms.map((p) => PLATFORM_LABELS[p]).join(" "),
      CATEGORY_LABELS[item.category],
      audienceLabel(item),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.platform !== "ALL" && !item.platforms.includes(filters.platform)) return false;
  if (filters.audience === "CUSTOMER" && !hasCustomerPlatform(item.platforms)) return false;
  if (filters.audience === "SELLER" && !hasSellerPlatform(item.platforms)) return false;
  if (filters.status !== "ALL" && item.status !== filters.status) return false;
  if (filters.category !== "ALL" && item.category !== filters.category) return false;
  if (filters.dateFrom || filters.dateTo) {
    const stamp = item.sentAt ?? item.scheduledAt ?? item.createdAt;
    const at = new Date(stamp);
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00+05:30`);
      if (at < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T23:59:59+05:30`);
      if (at > to) return false;
    }
  }
  return true;
}

export function sortPushes(items: PushNotification[]) {
  const rank: Record<PushStatus, number> = {
    SCHEDULED: 0,
    DRAFT: 1,
    SENT: 2,
    FAILED: 3,
    CANCELLED: 4,
  };
  return [...items].sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function duplicatePushName(name: string) {
  return name.endsWith(" - Copy") ? name : `${name} - Copy`;
}

export function formValuesToPush(values: PushNotificationInput, existing?: PushNotification | null): PushNotification {
  return {
    id: existing?.id ?? "PSH-PREVIEW",
    targeted: existing?.targeted ?? estimateReach(values),
    delivered: existing?.delivered ?? 0,
    opened: existing?.opened ?? 0,
    failed: existing?.failed ?? 0,
    createdBy: existing?.createdBy ?? "Admin",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sentAt: existing?.sentAt,
    ...values,
  };
}

export type PushFormErrors = Partial<Record<string, string>>;

export function validatePushForm(values: PushNotificationInput, action: "draft" | "schedule" | "send"): PushFormErrors {
  const errors: PushFormErrors = {};
  if (!values.name.trim()) errors.name = "Internal name is required.";
  if (!values.title.trim()) errors.title = "Notification title is required.";
  if (values.title.length > 65) errors.title = "Title must be 65 characters or less.";
  if (!values.body.trim()) errors.body = "Message body is required.";
  if (values.body.length > 240) errors.body = "Body must be 240 characters or less.";
  if (values.platforms.length === 0) errors.platforms = "Select at least one platform.";
  if (values.channels.length === 0) errors.channels = "Select at least one channel.";
  if (values.audienceMode === "SEGMENT") {
    if (hasCustomerPlatform(values.platforms) && values.customerSegments.length === 0) {
      errors.customerSegments = "Select at least one customer segment.";
    }
    if (hasSellerPlatform(values.platforms) && values.sellerSegments.length === 0) {
      errors.sellerSegments = "Select at least one seller segment.";
    }
  }
  if (action === "schedule") {
    if (!values.scheduledDate) errors.scheduledDate = "Schedule date is required.";
    if (!values.scheduledTime) errors.scheduledTime = "Schedule time is required.";
    if (values.scheduledDate && values.scheduledTime) {
      const start = parseSchedule(values.scheduledDate, values.scheduledTime);
      if (start <= new Date()) errors.scheduledDate = "Scheduled notifications must be in the future.";
    }
  }
  return errors;
}

export function openRate(item: PushNotification) {
  if (!item.delivered) return 0;
  return Number(((item.opened / item.delivered) * 100).toFixed(1));
}

export function deliveryRate(item: PushNotification) {
  if (!item.targeted) return 0;
  return Number(((item.delivered / item.targeted) * 100).toFixed(1));
}
