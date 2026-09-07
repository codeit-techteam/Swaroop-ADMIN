export type CampaignType =
  | "PROMOTIONAL"
  | "PRODUCT"
  | "OFFER"
  | "ANNOUNCEMENT"
  | "FESTIVAL"
  | "INFORMATIONAL";

export type BannerPlatform =
  | "CUSTOMER_APP"
  | "CUSTOMER_WEB"
  | "SELLER_APP"
  | "SELLER_WEB";

export type BannerStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "EXPIRED";

export type CtaAction =
  | "OPEN_PRODUCT"
  | "OPEN_OFFER"
  | "OPEN_MARKETPLACE"
  | "OPEN_ORDERS"
  | "OPEN_EXTERNAL_URL"
  | "NO_ACTION";

export type BannerPriority = 1 | 2 | 3 | 4 | 5;

export type CustomerPlacement =
  | "HOME_HERO"
  | "HOME_PROMOTIONAL"
  | "MARKETPLACE"
  | "PRODUCT_LISTING"
  | "PRODUCT_DETAIL"
  | "OFFERS"
  | "ORDERS"
  | "LOGIN"
  | "NOTIFICATIONS"
  | "OTHER";

export type SellerPlacement =
  | "SELLER_DASHBOARD"
  | "SELLER_MARKETPLACE"
  | "MY_OFFERS"
  | "SELLER_ORDERS"
  | "DISPATCH"
  | "SETTLEMENT"
  | "SELLER_DASHBOARD_PROMOTIONAL"
  | "OTHER";

export type BannerPlacement = CustomerPlacement | SellerPlacement;

export type CustomerAudience =
  | "ALL_CUSTOMERS"
  | "NEW_CUSTOMERS"
  | "EXISTING_CUSTOMERS"
  | "HIGH_VALUE_CUSTOMERS"
  | "BUSINESS_CUSTOMERS";

export type SellerAudience =
  | "ALL_SELLERS"
  | "NEW_SELLERS"
  | "VERIFIED_SELLERS"
  | "HIGH_PERFORMING_SELLERS"
  | "SELLERS_WITH_ACTIVE_OFFERS";

export type BannerAudience = CustomerAudience | SellerAudience;

export type Banner = {
  id: string;
  name: string;
  campaignName: string;
  description?: string;
  campaignType: CampaignType;
  platforms: BannerPlatform[];
  placements: BannerPlacement[];
  desktopImage?: string;
  mobileImage?: string;
  desktopMediaId?: string;
  mobileMediaId?: string;
  headline: string;
  subheadline?: string;
  ctaText?: string;
  ctaAction?: CtaAction;
  targetId?: string;
  externalUrl?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: "Asia/Kolkata";
  status: BannerStatus;
  priority: BannerPriority;
  displayOrder: number;
  audience?: BannerAudience[];
  impressions: number;
  clicks: number;
  ctr: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BannerInput = Omit<
  Banner,
  "id" | "impressions" | "clicks" | "ctr" | "createdBy" | "createdAt" | "updatedAt"
>;

export type BannerFormValues = BannerInput;

export type BannerSaveAction = "draft" | "schedule" | "activate";

export type BannerFilters = {
  search: string;
  platform: BannerPlatform | "ALL";
  placement: BannerPlacement | "ALL";
  status: BannerStatus | "ALL";
  campaignType: CampaignType | "ALL";
  dateFrom: string;
  dateTo: string;
};

export type MediaType = "IMAGE" | "VIDEO" | "OTHER";

export type MediaAsset = {
  id: string;
  fileName: string;
  type: MediaType;
  mimeType: string;
  url: string;
  width?: number;
  height?: number;
  usedIn: string[];
  uploadedAt: string;
  uploadedBy: string;
};

export type BannerAuditEvent = {
  id: string;
  action: string;
  entityType: "BANNER";
  entityId: string;
  performedBy: string;
  timestamp: string;
};

export type BannerKpis = {
  total: number;
  active: number;
  scheduled: number;
  drafts: number;
  expired: number;
  paused: number;
};

export const EMPTY_BANNER_FILTERS: BannerFilters = {
  search: "",
  platform: "ALL",
  placement: "ALL",
  status: "ALL",
  campaignType: "ALL",
  dateFrom: "",
  dateTo: "",
};
