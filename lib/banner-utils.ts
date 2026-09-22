import type { AppSource } from "@/types";
import type {
  Banner,
  BannerAudience,
  BannerFilters,
  BannerInput,
  BannerKpis,
  BannerPlacement,
  BannerPlatform,
  BannerPriority,
  BannerStatus,
  CampaignType,
  CtaAction,
  CustomerAudience,
  CustomerPlacement,
  SellerAudience,
  SellerPlacement,
} from "@/types/banner";

export const TIMEZONE = "Asia/Kolkata" as const;

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  PROMOTIONAL: "Promotional",
  PRODUCT: "Product",
  OFFER: "Offer",
  ANNOUNCEMENT: "Announcement",
  FESTIVAL: "Festival",
  INFORMATIONAL: "Informational",
};

export const PLATFORM_LABELS: Record<BannerPlatform, AppSource> = {
  CUSTOMER_APP: "Customer App",
  CUSTOMER_WEB: "Customer Web",
  SELLER_APP: "Seller App",
  SELLER_WEB: "Seller Web",
};

export const STATUS_LABELS: Record<BannerStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  EXPIRED: "Expired",
};

export const CTA_LABELS: Record<CtaAction, string> = {
  OPEN_PRODUCT: "Open Product",
  OPEN_OFFER: "Open Offer",
  OPEN_MARKETPLACE: "Open Marketplace",
  OPEN_ORDERS: "Open Orders",
  OPEN_EXTERNAL_URL: "Open External URL",
  NO_ACTION: "No Action",
};

export const PRIORITY_LABELS: Record<BannerPriority, string> = {
  1: "P1 - Highest",
  2: "P2",
  3: "P3",
  4: "P4",
  5: "P5 - Lowest",
};

export const CUSTOMER_PLACEMENTS: { id: CustomerPlacement; label: string }[] = [
  { id: "HOME_HERO", label: "Home Hero" },
  { id: "HOME_PROMOTIONAL", label: "Home Promotional" },
  { id: "MARKETPLACE", label: "Marketplace" },
  { id: "PRODUCT_LISTING", label: "Product Listing" },
  { id: "PRODUCT_DETAIL", label: "Product Detail" },
  { id: "OFFERS", label: "Offers" },
  { id: "ORDERS", label: "Orders" },
  { id: "LOGIN", label: "Login" },
  { id: "NOTIFICATIONS", label: "Notifications" },
  { id: "OTHER", label: "Other" },
];

export const SELLER_PLACEMENTS: { id: SellerPlacement; label: string }[] = [
  { id: "SELLER_DASHBOARD", label: "Seller Dashboard" },
  { id: "SELLER_MARKETPLACE", label: "Seller Marketplace" },
  { id: "MY_OFFERS", label: "My Offers" },
  { id: "SELLER_ORDERS", label: "Orders" },
  { id: "DISPATCH", label: "Dispatch" },
  { id: "SETTLEMENT", label: "Settlement" },
  { id: "SELLER_DASHBOARD_PROMOTIONAL", label: "Seller Dashboard Promotional" },
  { id: "OTHER", label: "Other" },
];

const seenPlacements = new Set<string>();
export const ALL_PLACEMENTS = [...CUSTOMER_PLACEMENTS, ...SELLER_PLACEMENTS].filter((item) => {
  if (seenPlacements.has(item.id)) return false;
  seenPlacements.add(item.id);
  return true;
});

export const CUSTOMER_AUDIENCES: { id: CustomerAudience; label: string }[] = [
  { id: "ALL_CUSTOMERS", label: "All Customers" },
  { id: "NEW_CUSTOMERS", label: "New Customers" },
  { id: "EXISTING_CUSTOMERS", label: "Existing Customers" },
  { id: "HIGH_VALUE_CUSTOMERS", label: "High Value Customers" },
  { id: "BUSINESS_CUSTOMERS", label: "Business Customers" },
];

export const SELLER_AUDIENCES: { id: SellerAudience; label: string }[] = [
  { id: "ALL_SELLERS", label: "All Sellers" },
  { id: "NEW_SELLERS", label: "New Sellers" },
  { id: "VERIFIED_SELLERS", label: "Verified Sellers" },
  { id: "HIGH_PERFORMING_SELLERS", label: "High Performing Sellers" },
  { id: "SELLERS_WITH_ACTIVE_OFFERS", label: "Sellers with Active Offers" },
];

const PLACEMENT_LABEL_MAP = new Map(ALL_PLACEMENTS.map((item) => [item.id, item.label]));
const AUDIENCE_LABEL_MAP = new Map(
  [...CUSTOMER_AUDIENCES, ...SELLER_AUDIENCES].map((item) => [item.id, item.label]),
);

export function placementLabel(id: string) {
  return PLACEMENT_LABEL_MAP.get(id as BannerPlacement) ?? id;
}

export function audienceLabel(id: string) {
  return AUDIENCE_LABEL_MAP.get(id as BannerAudience) ?? id;
}

export function hasCustomerPlatform(platforms: BannerPlatform[]) {
  return platforms.some((p) => p === "CUSTOMER_APP" || p === "CUSTOMER_WEB");
}

export function hasSellerPlatform(platforms: BannerPlatform[]) {
  return platforms.some((p) => p === "SELLER_APP" || p === "SELLER_WEB");
}

export function relevantPlacements(platforms: BannerPlatform[]) {
  const items: { id: BannerPlacement; label: string }[] = [];
  if (hasCustomerPlatform(platforms)) items.push(...CUSTOMER_PLACEMENTS);
  if (hasSellerPlatform(platforms)) items.push(...SELLER_PLACEMENTS);
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function parseBannerDateTime(date: string, time: string) {
  const safeTime = time || "00:00";
  return new Date(`${date}T${safeTime}:00+05:30`);
}

export function deriveBannerStatus(
  banner: Pick<Banner, "startDate" | "startTime" | "endDate" | "endTime">,
  options?: { paused?: boolean; now?: Date },
): BannerStatus {
  if (options?.paused) return "PAUSED";
  const now = options?.now ?? new Date();
  const start = parseBannerDateTime(banner.startDate, banner.startTime);
  const end = parseBannerDateTime(banner.endDate, banner.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "DRAFT";
  if (now < start) return "SCHEDULED";
  if (now > end) return "EXPIRED";
  return "ACTIVE";
}

export function isWithinSchedule(banner: Banner, now = new Date()) {
  const start = parseBannerDateTime(banner.startDate, banner.startTime);
  const end = parseBannerDateTime(banner.endDate, banner.endTime);
  return now >= start && now <= end;
}

export function bannerKpis(banners: Banner[]): BannerKpis {
  return {
    total: banners.length,
    active: banners.filter((b) => b.status === "ACTIVE").length,
    scheduled: banners.filter((b) => b.status === "SCHEDULED").length,
    drafts: banners.filter((b) => b.status === "DRAFT").length,
    expired: banners.filter((b) => b.status === "EXPIRED").length,
    paused: banners.filter((b) => b.status === "PAUSED").length,
  };
}

export function matchesBannerFilters(banner: Banner, filters: BannerFilters) {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      banner.name,
      banner.campaignName,
      banner.headline,
      banner.subheadline ?? "",
      banner.platforms.map((p) => PLATFORM_LABELS[p]).join(" "),
      banner.placements.map(placementLabel).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.platform !== "ALL" && !banner.platforms.includes(filters.platform)) return false;
  if (filters.placement !== "ALL" && !banner.placements.includes(filters.placement)) return false;
  if (filters.status !== "ALL" && banner.status !== filters.status) return false;
  if (filters.campaignType !== "ALL" && banner.campaignType !== filters.campaignType) return false;
  if (filters.dateFrom || filters.dateTo) {
    const start = parseBannerDateTime(banner.startDate, banner.startTime);
    const end = parseBannerDateTime(banner.endDate, banner.endTime);
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00+05:30`);
      if (end < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T23:59:59+05:30`);
      if (start > to) return false;
    }
  }
  return true;
}

export function sortBanners(banners: Banner[]) {
  return [...banners].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function liveForPlatform(banners: Banner[], platform: BannerPlatform, placement?: string) {
  return sortBanners(
    banners.filter((banner) => {
      if (!banner.platforms.includes(platform)) return false;
      if (banner.status !== "ACTIVE") return false;
      if (!isWithinSchedule(banner)) return false;
      if (placement && !banner.placements.includes(placement as BannerPlacement)) return false;
      return true;
    }),
  );
}

export function getCustomerBanners(banners: Banner[], placement?: string) {
  return sortBanners(
    banners.filter(
      (banner) =>
        hasCustomerPlatform(banner.platforms) &&
        banner.status === "ACTIVE" &&
        isWithinSchedule(banner) &&
        (!placement || banner.placements.includes(placement as BannerPlacement)),
    ),
  );
}

export function getSellerBanners(banners: Banner[], placement?: string) {
  return sortBanners(
    banners.filter(
      (banner) =>
        hasSellerPlatform(banner.platforms) &&
        banner.status === "ACTIVE" &&
        isWithinSchedule(banner) &&
        (!placement || banner.placements.includes(placement as BannerPlacement)),
    ),
  );
}

export function getCustomerAppBanners(banners: Banner[], placement?: string) {
  return liveForPlatform(banners, "CUSTOMER_APP", placement);
}

export function getCustomerWebBanners(banners: Banner[], placement?: string) {
  return liveForPlatform(banners, "CUSTOMER_WEB", placement);
}

export function getSellerAppBanners(banners: Banner[], placement?: string) {
  return liveForPlatform(banners, "SELLER_APP", placement);
}

export function getSellerWebBanners(banners: Banner[], placement?: string) {
  return liveForPlatform(banners, "SELLER_WEB", placement);
}

export function ctrPercent(impressions: number, clicks: number) {
  if (!impressions) return 0;
  return Number(((clicks / impressions) * 100).toFixed(2));
}

export function duplicateBannerName(name: string) {
  return name.endsWith(" - Copy") ? name : `${name} - Copy`;
}

export function makeBannerImage(opts: {
  title: string;
  subtitle: string;
  from: string;
  to: string;
  width?: number;
  height?: number;
}) {
  const width = opts.width ?? 1600;
  const height = opts.height ?? 500;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${opts.from}"/>
      <stop offset="100%" stop-color="${opts.to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="0" y="0" width="8" height="${height}" fill="#F8B400"/>
  <text x="72" y="${Math.round(height * 0.42)}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(height * 0.12)}" font-weight="700">${escapeXml(opts.title)}</text>
  <text x="72" y="${Math.round(height * 0.62)}" fill="rgba(255,255,255,0.88)" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(height * 0.055)}">${escapeXml(opts.subtitle)}</text>
  <text x="72" y="${height - 36}" fill="rgba(255,255,255,0.55)" font-family="Arial, Helvetica, sans-serif" font-size="18">PetroTrade OS</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type BannerFormErrors = Partial<Record<string, string>>;

export function formValuesToBanner(values: BannerInput, existing?: Banner | null): Banner {
  return {
    id: existing?.id ?? "BNR-PREVIEW",
    impressions: existing?.impressions ?? 0,
    clicks: existing?.clicks ?? 0,
    ctr: existing?.ctr ?? 0,
    createdBy: existing?.createdBy ?? "Admin",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...values,
  };
}

export function validateBannerForm(
  values: Pick<
    Banner,
    | "name"
    | "desktopImage"
    | "mobileImage"
    | "platforms"
    | "placements"
    | "headline"
    | "startDate"
    | "endDate"
    | "ctaAction"
    | "targetId"
    | "externalUrl"
  >,
  action: "draft" | "schedule" | "activate",
): BannerFormErrors {
  const errors: BannerFormErrors = {};
  if (!values.name.trim()) errors.name = "Banner name is required.";
  if (!values.desktopImage && !values.mobileImage) errors.creative = "Upload a desktop or mobile creative.";
  const creative = values.desktopImage || values.mobileImage;
  if (creative && (creative.startsWith("data:") || creative.startsWith("blob:"))) {
    errors.creative = "Upload the file or paste a public HTTPS image URL before saving.";
  }
  if (values.platforms.length === 0) errors.platforms = "Select at least one platform.";
  if (values.placements.length === 0) errors.placements = "Select at least one placement.";
  if (!values.headline.trim()) errors.headline = "Headline is required.";
  if (!values.startDate) errors.startDate = "Start date is required.";
  if (!values.endDate) errors.endDate = "End date is required.";
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = "End date must be on or after the start date.";
  }
  if (values.ctaAction === "OPEN_PRODUCT" && !values.targetId) {
    errors.targetId = "Select a product.";
  }
  if (values.ctaAction === "OPEN_OFFER" && !values.targetId) {
    errors.targetId = "Select an offer.";
  }
  if (values.ctaAction === "OPEN_EXTERNAL_URL" && !values.externalUrl?.trim()) {
    errors.externalUrl = "Enter an external URL.";
  }
  if (values.externalUrl?.trim()) {
    try {
      new URL(values.externalUrl);
    } catch {
      errors.externalUrl = "Enter a valid URL including https://";
    }
  }
  if (action === "schedule" && values.startDate) {
    const start = parseBannerDateTime(values.startDate, "00:00");
    if (start <= new Date()) {
      errors.startDate = "Scheduled banners must start in the future.";
    }
  }
  return errors;
}
