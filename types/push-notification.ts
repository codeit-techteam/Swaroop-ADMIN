export type PushPlatform =
  | "CUSTOMER_APP"
  | "CUSTOMER_WEB"
  | "SELLER_APP"
  | "SELLER_WEB";

export type PushChannel = "PUSH" | "IN_APP";

export type PushStatus = "DRAFT" | "SCHEDULED" | "SENT" | "FAILED" | "CANCELLED";

export type PushPriority = "HIGH" | "NORMAL" | "LOW";

export type PushCategory =
  | "ANNOUNCEMENT"
  | "PROMOTION"
  | "OFFER"
  | "ORDER"
  | "PAYMENT"
  | "DOCUMENT"
  | "KYC"
  | "SYSTEM";

export type PushAudienceMode = "ALL" | "SEGMENT";

export type CustomerSegment =
  | "ALL_CUSTOMERS"
  | "NEW_CUSTOMERS"
  | "EXISTING_CUSTOMERS"
  | "HIGH_VALUE_CUSTOMERS"
  | "BUSINESS_CUSTOMERS";

export type SellerSegment =
  | "ALL_SELLERS"
  | "NEW_SELLERS"
  | "VERIFIED_SELLERS"
  | "HIGH_PERFORMING_SELLERS"
  | "SELLERS_WITH_ACTIVE_OFFERS";

export type PushCtaAction =
  | "NO_ACTION"
  | "OPEN_DASHBOARD"
  | "OPEN_MARKETPLACE"
  | "OPEN_ORDERS"
  | "OPEN_OFFERS"
  | "OPEN_PAYMENTS"
  | "OPEN_DOCUMENTS"
  | "OPEN_CREDIT"
  | "OPEN_DISPATCH"
  | "OPEN_SETTLEMENTS"
  | "OPEN_REQUESTS"
  | "OPEN_PRODUCTS"
  | "OPEN_SUPPORT";

export type PushSaveAction = "draft" | "schedule" | "send";

export type PushNotification = {
  id: string;
  name: string;
  title: string;
  body: string;
  category: PushCategory;
  priority: PushPriority;
  platforms: PushPlatform[];
  channels: PushChannel[];
  audienceMode: PushAudienceMode;
  customerSegments: CustomerSegment[];
  sellerSegments: SellerSegment[];
  ctaText?: string;
  ctaAction: PushCtaAction;
  deepLink?: string;
  imageUrl?: string;
  status: PushStatus;
  timezone: "Asia/Kolkata";
  scheduledDate: string;
  scheduledTime: string;
  scheduledAt?: string;
  sentAt?: string;
  targeted: number;
  delivered: number;
  opened: number;
  failed: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PushNotificationInput = Omit<
  PushNotification,
  "id" | "targeted" | "delivered" | "opened" | "failed" | "createdBy" | "createdAt" | "updatedAt" | "sentAt"
>;

export type PushFilters = {
  search: string;
  platform: PushPlatform | "ALL";
  audience: "ALL" | "CUSTOMER" | "SELLER";
  status: PushStatus | "ALL";
  category: PushCategory | "ALL";
  dateFrom: string;
  dateTo: string;
};

export type PushKpis = {
  total: number;
  sent: number;
  scheduled: number;
  drafts: number;
  failed: number;
};

export type PushAuditEvent = {
  id: string;
  action: string;
  entityType: "PUSH_NOTIFICATION";
  entityId: string;
  performedBy: string;
  timestamp: string;
};

/** Payload consumed by Customer / Seller APP + WEBAPP inboxes. */
export type PushPublicPayload = {
  id: string;
  title: string;
  body: string;
  category: PushCategory;
  priority: PushPriority;
  platforms: PushPlatform[];
  channels: PushChannel[];
  ctaText?: string;
  ctaAction: PushCtaAction;
  deepLink: string;
  imageUrl?: string;
  sentAt: string;
  audience: "CUSTOMER" | "SELLER";
};

export const EMPTY_PUSH_FILTERS: PushFilters = {
  search: "",
  platform: "ALL",
  audience: "ALL",
  status: "ALL",
  category: "ALL",
  dateFrom: "",
  dateTo: "",
};
