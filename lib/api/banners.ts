import {
  ctrPercent,
  deriveBannerStatus,
  duplicateBannerName,
  getCustomerAppBanners as filterCustomerApp,
  getCustomerBanners as filterCustomer,
  getCustomerWebBanners as filterCustomerWeb,
  getSellerAppBanners as filterSellerApp,
  getSellerBanners as filterSeller,
  getSellerWebBanners as filterSellerWeb,
} from "@/lib/banner-utils";
import { apiRequest } from "@/lib/api/client";
import type {
  Banner,
  BannerInput,
  BannerPlacement,
  BannerPlatform,
  BannerPriority,
  BannerStatus,
  CampaignType,
  CtaAction,
  BannerLayoutVariant,
} from "@/types/banner";

type CmsBanner = {
  id: string;
  title: string;
  subtitle?: string | null;
  placement?: string;
  platform?: string;
  status?: string;
  displayOrder?: number;
  startAt?: string | null;
  endAt?: string | null;
  mediaKey?: string | null;
  mediaUrl?: string | null;
  targetRoute?: string | null;
  impressionCount?: number;
  clickCount?: number;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string | null;
};

let cache: Banner[] = [];

function splitIso(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return {
      date: now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
      time: now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }),
    };
  }
  return {
    date: date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    time: date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }),
  };
}

function asStatus(row: CmsBanner): BannerStatus {
  const value = row.status;
  if (value === "PAUSED") return "PAUSED";
  if (value === "EXPIRED" || value === "ARCHIVED") return "EXPIRED";
  if (value === "DRAFT") return "DRAFT";
  const start = splitIso(row.startAt);
  const end = splitIso(row.endAt);
  const derived = deriveBannerStatus({
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
  });
  if (derived === "SCHEDULED" || derived === "EXPIRED") return derived;
  return "ACTIVE";
}

function asPlatforms(row: CmsBanner): BannerPlatform[] {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  if (Array.isArray(meta.platforms) && meta.platforms.length) {
    const mapped = meta.platforms.filter((item): item is BannerPlatform =>
      item === "CUSTOMER_APP" ||
      item === "CUSTOMER_WEB" ||
      item === "SELLER_APP" ||
      item === "SELLER_WEB",
    );
    if (mapped.length) return mapped;
  }
  switch (row.platform) {
    case "CUSTOMER_WEB":
      return ["CUSTOMER_WEB"];
    case "CUSTOMER_ALL":
      return ["CUSTOMER_APP", "CUSTOMER_WEB"];
    case "SELLER_APP":
      return ["SELLER_APP"];
    case "SELLER_WEB":
      return ["SELLER_WEB"];
    case "SELLER_ALL":
      return ["SELLER_APP", "SELLER_WEB"];
    case "ALL":
      return ["CUSTOMER_APP", "CUSTOMER_WEB", "SELLER_APP", "SELLER_WEB"];
    default:
      return ["CUSTOMER_APP"];
  }
}

function asPlacement(value?: string): BannerPlacement {
  const allowed: BannerPlacement[] = [
    "HOME_HERO",
    "HOME_PROMOTIONAL",
    "MARKETPLACE",
    "PRODUCT_LISTING",
    "PRODUCT_DETAIL",
    "OFFERS",
    "ORDERS",
    "LOGIN",
    "NOTIFICATIONS",
    "OTHER",
    "SELLER_DASHBOARD",
    "SELLER_MARKETPLACE",
    "MY_OFFERS",
    "SELLER_ORDERS",
    "DISPATCH",
    "SETTLEMENT",
    "SELLER_DASHBOARD_PROMOTIONAL",
  ];
  return allowed.includes(value as BannerPlacement) ? (value as BannerPlacement) : "OTHER";
}

function cmsPlacement(value?: string) {
  switch (value) {
    case "HOME_HERO":
    case "HOME_PROMOTIONAL":
      return "HOME_HERO";
    case "MARKETPLACE":
    case "PRODUCT_LISTING":
    case "PRODUCT_DETAIL":
    case "SELLER_MARKETPLACE":
      return "MARKETPLACE";
    case "OFFERS":
    case "MY_OFFERS":
      return "OFFERS";
    case "LOGIN":
      return "LOGIN";
    case "DASHBOARD":
    case "ORDERS":
    case "SELLER_DASHBOARD":
    case "SELLER_DASHBOARD_PROMOTIONAL":
    case "SELLER_ORDERS":
    case "DISPATCH":
    case "SETTLEMENT":
      return "DASHBOARD";
    default:
      return "OTHER";
  }
}

function cmsStatus(value?: BannerStatus) {
  if (value === "PAUSED" || value === "EXPIRED") return value;
  if (value === "ACTIVE" || value === "SCHEDULED") return "ACTIVE";
  return "DRAFT";
}

function cmsPlatform(platforms?: BannerPlatform[]) {
  const unique = [...new Set(platforms ?? [])];
  const customer = unique.filter((item) => item === "CUSTOMER_APP" || item === "CUSTOMER_WEB");
  const seller = unique.filter((item) => item === "SELLER_APP" || item === "SELLER_WEB");
  if (customer.length && seller.length) return "ALL";
  if (customer.length === 2) return "CUSTOMER_ALL";
  if (seller.length === 2) return "SELLER_ALL";
  return unique[0] ?? "CUSTOMER_APP";
}

function isTransientMedia(value?: string) {
  return Boolean(value && (value.startsWith("data:") || value.startsWith("blob:")));
}

function persistableMediaRef(
  storageKey?: string,
  previewOrUrl?: string,
): string | undefined {
  if (storageKey && !isTransientMedia(storageKey)) return storageKey;
  if (previewOrUrl && !isTransientMedia(previewOrUrl)) return previewOrUrl;
  return undefined;
}

function mapBanner(row: CmsBanner): Banner {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const start = splitIso(row.startAt);
  const end = splitIso(row.endAt);
  // Always keep the raw object key for re-save; use resolved URL for UI preview.
  const storageKey =
    typeof row.mediaKey === "string" && row.mediaKey.trim()
      ? row.mediaKey.trim()
      : undefined;
  const preview = row.mediaUrl ?? storageKey ?? undefined;
  const mobileStorage =
    typeof meta.mobileImage === "string" && meta.mobileImage.trim()
      ? meta.mobileImage.trim()
      : storageKey;
  const mobilePreview =
    typeof meta.mobileImageUrl === "string"
      ? meta.mobileImageUrl
      : mobileStorage;
  const impressions = Number(row.impressionCount ?? meta.impressions) || 0;
  const clicks = Number(row.clickCount ?? meta.clicks) || 0;
  return {
    id: row.id,
    name: String(meta.name ?? row.title),
    campaignName: String(meta.campaignName ?? row.title),
    description: String(meta.description ?? row.subtitle ?? ""),
    campaignType: (meta.campaignType as CampaignType) || "INFORMATIONAL",
    platforms: asPlatforms(row),
    placements: [asPlacement(String(meta.placement ?? row.placement ?? "HOME_HERO"))],
    desktopImage: preview,
    mobileImage: mobilePreview ?? preview,
    desktopMediaId: storageKey,
    mobileMediaId: mobileStorage,
    badge: typeof meta.badge === "string" ? meta.badge : undefined,
    headline: row.title,
    subheadline: row.subtitle ?? undefined,
    layoutVariant:
      meta.layoutVariant === "NAVY_GRID" || meta.layoutVariant === "IMAGE_OVERLAY"
        ? (meta.layoutVariant as BannerLayoutVariant)
        : preview
          ? "IMAGE_OVERLAY"
          : "NAVY_GRID",
    ctaText: String(meta.ctaText ?? "View"),
    ctaAction: (meta.ctaAction as CtaAction) || "NO_ACTION",
    targetId: String(meta.targetId ?? row.targetRoute ?? ""),
    externalUrl: typeof meta.externalUrl === "string" ? meta.externalUrl : undefined,
    secondaryCtaText:
      typeof meta.secondaryCtaText === "string" ? meta.secondaryCtaText : undefined,
    secondaryCtaAction: (meta.secondaryCtaAction as CtaAction) || undefined,
    secondaryTargetId:
      typeof meta.secondaryTargetId === "string" ? meta.secondaryTargetId : undefined,
    secondaryExternalUrl:
      typeof meta.secondaryExternalUrl === "string"
        ? meta.secondaryExternalUrl
        : undefined,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    timezone: "Asia/Kolkata",
    status: asStatus(row),
    priority: (Number(meta.priority) || 3) as BannerPriority,
    displayOrder: row.displayOrder ?? 0,
    impressions,
    clicks,
    ctr: ctrPercent(impressions, clicks),
    createdBy: String(meta.createdBy ?? "Admin"),
    createdAt: row.createdAt ?? new Date().toISOString(),
    updatedAt: row.updatedAt ?? new Date().toISOString(),
  };
}

function toCmsPayload(input: BannerInput | Partial<Banner>, actor?: string) {
  const startDate = "startDate" in input ? input.startDate : undefined;
  const startTime = "startTime" in input ? input.startTime : undefined;
  const endDate = "endDate" in input ? input.endDate : undefined;
  const endTime = "endTime" in input ? input.endTime : undefined;
  const platforms = input.platforms ?? [];
  const platform = cmsPlatform(platforms);
  const placement = input.placements?.[0] ?? "HOME_HERO";
  const desktop = persistableMediaRef(input.desktopMediaId, input.desktopImage);
  const mobile = persistableMediaRef(input.mobileMediaId, input.mobileImage);
  return {
    title: input.headline ?? input.name ?? "Banner",
    subtitle: input.subheadline ?? input.description,
    placement: cmsPlacement(placement),
    platform,
    status: cmsStatus(input.status),
    displayOrder: input.displayOrder,
    startAt: startDate ? `${startDate}T${startTime || "00:00"}:00+05:30` : undefined,
    endAt: endDate ? `${endDate}T${endTime || "23:59"}:00+05:30` : undefined,
    // Persist R2 object key (or stable HTTPS URL) — never a short-lived signed URL alone.
    mediaKey: desktop ?? mobile,
    targetRoute: input.targetId || input.externalUrl,
    metadata: {
      name: input.name,
      campaignName: input.campaignName,
      description: input.description,
      campaignType: input.campaignType,
      platforms,
      platform,
      placement,
      badge: input.badge,
      layoutVariant: input.layoutVariant ?? (desktop || mobile ? "IMAGE_OVERLAY" : "NAVY_GRID"),
      ctaText: input.ctaText,
      ctaAction: input.ctaAction,
      targetId: input.targetId,
      priority: input.priority,
      createdBy: actor,
      mobileImage: mobile ?? desktop,
      externalUrl: input.externalUrl,
      secondaryCtaText: input.secondaryCtaText,
      secondaryCtaAction: input.secondaryCtaAction,
      secondaryTargetId: input.secondaryTargetId,
      secondaryExternalUrl: input.secondaryExternalUrl,
    },
  };
}

async function listAllBanners() {
  const pages: CmsBanner[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, meta } = await apiRequest<CmsBanner[]>(`/admin/cms/banners?page=${page}&limit=100`);
    pages.push(...(data ?? []));
    totalPages = meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 10);
  cache = pages.map(mapBanner);
  return cache.map((item) => structuredClone(item));
}

export async function getBanners(): Promise<Banner[]> {
  return listAllBanners();
}

export function getBannersSync(): Banner[] {
  return structuredClone(cache);
}

export async function getBannerById(id: string): Promise<Banner | undefined> {
  const { data } = await apiRequest<CmsBanner>(`/admin/cms/banners/${id}`);
  return mapBanner(data);
}

export async function createBanner(input: BannerInput, actor = "Admin"): Promise<Banner> {
  const { data } = await apiRequest<CmsBanner>("/admin/cms/banners", {
    method: "POST",
    body: JSON.stringify(toCmsPayload(input, actor)),
  });
  const created = mapBanner(data);
  cache = [created, ...cache.filter((item) => item.id !== created.id)];
  return structuredClone(created);
}

export async function updateBanner(id: string, patch: Partial<Banner>): Promise<Banner> {
  const current = cache.find((item) => item.id === id) ?? (await getBannerById(id));
  if (!current) throw new Error("Banner not found");
  const next = { ...current, ...patch, id: current.id };
  if (typeof next.impressions === "number" && typeof next.clicks === "number") {
    next.ctr = ctrPercent(next.impressions, next.clicks);
  }
  const { data } = await apiRequest<CmsBanner>(`/admin/cms/banners/${id}`, {
    method: "PATCH",
    body: JSON.stringify(toCmsPayload(next)),
  });
  const updated = mapBanner(data);
  cache = cache.map((item) => (item.id === id ? updated : item));
  return structuredClone(updated);
}

export async function deleteBanner(id: string): Promise<void> {
  await apiRequest(`/admin/cms/banners/${id}`, { method: "DELETE" });
  cache = cache.filter((item) => item.id !== id);
}

export async function duplicateBanner(id: string, actor = "Admin"): Promise<Banner> {
  const source = await getBannerById(id);
  if (!source) throw new Error("Banner not found");
  const input: BannerInput = {
    name: duplicateBannerName(source.name),
    campaignName: source.campaignName,
    description: source.description,
    campaignType: source.campaignType,
    platforms: [...source.platforms],
    placements: [...source.placements],
    desktopImage: source.desktopImage,
    mobileImage: source.mobileImage,
    desktopMediaId: source.desktopMediaId,
    mobileMediaId: source.mobileMediaId,
    badge: source.badge,
    headline: source.headline,
    subheadline: source.subheadline,
    layoutVariant: source.layoutVariant,
    ctaText: source.ctaText,
    ctaAction: source.ctaAction,
    targetId: source.targetId,
    externalUrl: source.externalUrl,
    secondaryCtaText: source.secondaryCtaText,
    secondaryCtaAction: source.secondaryCtaAction,
    secondaryTargetId: source.secondaryTargetId,
    secondaryExternalUrl: source.secondaryExternalUrl,
    startDate: source.startDate,
    startTime: source.startTime,
    endDate: source.endDate,
    endTime: source.endTime,
    timezone: "Asia/Kolkata",
    status: "DRAFT",
    priority: source.priority,
    displayOrder: source.displayOrder,
    audience: source.audience ? [...source.audience] : undefined,
  };
  return createBanner(input, actor);
}

export async function activateBanner(id: string): Promise<Banner> {
  return updateBanner(id, { status: "ACTIVE" });
}

export async function pauseBanner(id: string): Promise<Banner> {
  return updateBanner(id, { status: "PAUSED" });
}

export async function resumeBanner(id: string): Promise<Banner> {
  return updateBanner(id, { status: "ACTIVE" });
}

export async function bulkDelete(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteBanner(id);
  }
}

export async function bulkActivate(ids: string[]): Promise<Banner[]> {
  const updated: Banner[] = [];
  for (const id of ids) {
    updated.push(await activateBanner(id));
  }
  return updated;
}

export async function bulkPause(ids: string[]): Promise<Banner[]> {
  const updated: Banner[] = [];
  for (const id of ids) {
    updated.push(await pauseBanner(id));
  }
  return updated;
}

export async function bulkChangePriority(ids: string[], priority: BannerPriority): Promise<Banner[]> {
  const updated: Banner[] = [];
  for (const id of ids) {
    updated.push(await updateBanner(id, { priority }));
  }
  return updated;
}

export async function getCustomerBanners() {
  return filterCustomer(await getBanners());
}

export async function getSellerBanners() {
  return filterSeller(await getBanners());
}

export async function getCustomerAppBanners(placement?: BannerPlacement) {
  return filterCustomerApp(await getBanners(), placement);
}

export async function getCustomerWebBanners(placement?: BannerPlacement) {
  return filterCustomerWeb(await getBanners(), placement);
}

export async function getSellerAppBanners(placement?: BannerPlacement) {
  return filterSellerApp(await getBanners(), placement);
}

export async function getSellerWebBanners(placement?: BannerPlacement) {
  return filterSellerWeb(await getBanners(), placement);
}

export function getPlatformBanners(platform: BannerPlatform, placement?: BannerPlacement) {
  switch (platform) {
    case "CUSTOMER_APP":
      return getCustomerAppBanners(placement);
    case "CUSTOMER_WEB":
      return getCustomerWebBanners(placement);
    case "SELLER_APP":
      return getSellerAppBanners(placement);
    case "SELLER_WEB":
      return getSellerWebBanners(placement);
  }
}

/**
 * Upload a banner creative to R2 via a signed PUT URL.
 * Returns the durable object key for DB persistence plus a preview URL for the form.
 */
export async function uploadBannerCreative(
  file: File,
): Promise<{ mediaKey: string; mediaUrl: string }> {
  const { data } = await apiRequest<{
    mediaKey: string;
    uploadUrl: string;
    mediaUrl?: string | null;
  }>("/admin/cms/banners/media-upload", {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      fileSizeBytes: file.size,
    }),
  });
  const uploaded = await fetch(data.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "image/jpeg" },
  });
  if (!uploaded.ok) {
    throw new Error("Could not upload the banner creative.");
  }
  // Always persist mediaKey (R2 object key). mediaUrl is for UI preview only —
  // signed GET URLs expire; storing them as mediaKey breaks customer apps.
  return {
    mediaKey: data.mediaKey,
    mediaUrl: data.mediaUrl || data.mediaKey,
  };
}

export const bannerApi = {
  getBanners,
  getBannersSync,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  duplicateBanner,
  activateBanner,
  pauseBanner,
  resumeBanner,
  bulkDelete,
  bulkActivate,
  bulkPause,
  bulkChangePriority,
  uploadBannerCreative,
  getCustomerBanners,
  getSellerBanners,
  getCustomerAppBanners,
  getCustomerWebBanners,
  getSellerAppBanners,
  getSellerWebBanners,
};
