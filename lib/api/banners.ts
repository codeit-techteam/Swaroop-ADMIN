import {
  ctrPercent,
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
  targetRoute?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string | null;
};

let cache: Banner[] = [];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function splitIso(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    return {
      date: now.toISOString().slice(0, 10),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  }
  return {
    date: date.toISOString().slice(0, 10),
    time: `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`,
  };
}

function asStatus(value?: string): BannerStatus {
  if (value === "ACTIVE" || value === "PAUSED" || value === "EXPIRED" || value === "DRAFT") {
    return value;
  }
  if (value === "ARCHIVED") return "EXPIRED";
  return "DRAFT";
}

function asPlatform(value?: string): BannerPlatform {
  if (value === "CUSTOMER_WEB" || value === "SELLER_APP" || value === "SELLER_WEB") {
    return value;
  }
  return "CUSTOMER_APP";
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
    case "MARKETPLACE":
    case "DASHBOARD":
    case "OFFERS":
    case "LOGIN":
    case "OTHER":
      return value;
    default:
      return "OTHER";
  }
}

function cmsStatus(value?: BannerStatus) {
  if (value === "ACTIVE" || value === "PAUSED" || value === "EXPIRED") return value;
  return "DRAFT";
}

function mapBanner(row: CmsBanner): Banner {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const start = splitIso(row.startAt);
  const end = splitIso(row.endAt);
  const platform = asPlatform(String(meta.platform ?? row.platform ?? "CUSTOMER_APP"));
  return {
    id: row.id,
    name: String(meta.name ?? row.title),
    campaignName: String(meta.campaignName ?? row.title),
    description: String(meta.description ?? row.subtitle ?? ""),
    campaignType: (meta.campaignType as CampaignType) || "INFORMATIONAL",
    platforms: [platform],
    placements: [asPlacement(String(meta.placement ?? row.placement ?? "HOME_HERO"))],
    desktopImage: row.mediaKey ?? undefined,
    mobileImage: row.mediaKey ?? undefined,
    headline: row.title,
    subheadline: row.subtitle ?? undefined,
    ctaText: String(meta.ctaText ?? "View"),
    ctaAction: (meta.ctaAction as CtaAction) || "NO_ACTION",
    targetId: row.targetRoute ?? undefined,
    externalUrl: typeof meta.externalUrl === "string" ? meta.externalUrl : undefined,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    timezone: "Asia/Kolkata",
    status: asStatus(row.status),
    priority: (Number(meta.priority) || 3) as BannerPriority,
    displayOrder: row.displayOrder ?? 0,
    impressions: Number(meta.impressions) || 0,
    clicks: Number(meta.clicks) || 0,
    ctr: Number(meta.ctr) || 0,
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
  const platform = input.platforms?.[0] ?? "CUSTOMER_APP";
  const placement = input.placements?.[0] ?? "HOME_HERO";
  return {
    title: input.headline ?? input.name ?? "Banner",
    subtitle: input.subheadline ?? input.description,
    placement: cmsPlacement(placement),
    platform,
    status: cmsStatus(input.status),
    displayOrder: input.displayOrder,
    startAt: startDate ? `${startDate}T${startTime || "00:00"}:00.000Z` : undefined,
    endAt: endDate ? `${endDate}T${endTime || "23:59"}:00.000Z` : undefined,
    mediaKey: input.desktopImage ?? input.mobileImage,
    targetRoute: input.targetId ?? input.externalUrl,
    metadata: {
      name: input.name,
      campaignName: input.campaignName,
      description: input.description,
      campaignType: input.campaignType,
      platform,
      placement,
      ctaText: input.ctaText,
      ctaAction: input.ctaAction,
      priority: input.priority,
      createdBy: actor,
      impressions: "impressions" in input ? input.impressions : 0,
      clicks: "clicks" in input ? input.clicks : 0,
      ctr: "ctr" in input ? input.ctr : 0,
      externalUrl: input.externalUrl,
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
    headline: source.headline,
    subheadline: source.subheadline,
    ctaText: source.ctaText,
    ctaAction: source.ctaAction,
    targetId: source.targetId,
    externalUrl: source.externalUrl,
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
  getCustomerBanners,
  getSellerBanners,
  getCustomerAppBanners,
  getCustomerWebBanners,
  getSellerAppBanners,
  getSellerWebBanners,
};
