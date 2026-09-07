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
import { banners as seedBanners } from "@/lib/mock-data/banners";
import { delay } from "@/lib/utils";
import type { Banner, BannerInput, BannerPlacement, BannerPlatform, BannerPriority } from "@/types/banner";

let records: Banner[] = structuredClone(seedBanners);

function nextBannerId() {
  const nums = records
    .map((item) => Number(item.id.replace("BNR-", "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `BNR-${max + 1}`;
}

function clone(list: Banner[]) {
  return structuredClone(list);
}

export async function getBanners(): Promise<Banner[]> {
  await delay(320);
  return clone(records);
}

export function getBannersSync(): Banner[] {
  return clone(records);
}

export async function getBannerById(id: string): Promise<Banner | undefined> {
  await delay(180);
  const found = records.find((item) => item.id === id);
  return found ? structuredClone(found) : undefined;
}

export async function createBanner(input: BannerInput, actor = "Admin"): Promise<Banner> {
  await delay(280);
  const now = new Date().toISOString();
  const banner: Banner = {
    ...input,
    id: nextBannerId(),
    timezone: "Asia/Kolkata",
    impressions: 0,
    clicks: 0,
    ctr: 0,
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
  };
  records = [banner, ...records];
  return structuredClone(banner);
}

export async function updateBanner(id: string, patch: Partial<Banner>): Promise<Banner> {
  await delay(240);
  const index = records.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Banner not found");
  const current = records[index]!;
  const next: Banner = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  };
  if (typeof next.impressions === "number" && typeof next.clicks === "number") {
    next.ctr = ctrPercent(next.impressions, next.clicks);
  }
  records[index] = next;
  return structuredClone(next);
}

export async function deleteBanner(id: string): Promise<void> {
  await delay(200);
  records = records.filter((item) => item.id !== id);
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
  const current = await getBannerById(id);
  if (!current) throw new Error("Banner not found");
  const now = new Date();
  const start = new Date(`${current.startDate}T${current.startTime || "00:00"}:00+05:30`);
  const patch: Partial<Banner> = { status: "ACTIVE" };
  if (start > now) {
    patch.startDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    patch.startTime = now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
  }
  return updateBanner(id, patch);
}

export async function pauseBanner(id: string): Promise<Banner> {
  return updateBanner(id, { status: "PAUSED" });
}

export async function resumeBanner(id: string): Promise<Banner> {
  const current = await getBannerById(id);
  if (!current) throw new Error("Banner not found");
  return updateBanner(id, {
    status: deriveBannerStatus(current),
  });
}

export async function bulkDelete(ids: string[]): Promise<void> {
  await delay(240);
  const set = new Set(ids);
  records = records.filter((item) => !set.has(item.id));
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
  await delay(80);
  return filterCustomer(records);
}

export async function getSellerBanners() {
  await delay(80);
  return filterSeller(records);
}

export async function getCustomerAppBanners(placement?: BannerPlacement) {
  await delay(80);
  return filterCustomerApp(records, placement);
}

export async function getCustomerWebBanners(placement?: BannerPlacement) {
  await delay(80);
  return filterCustomerWeb(records, placement);
}

export async function getSellerAppBanners(placement?: BannerPlacement) {
  await delay(80);
  return filterSellerApp(records, placement);
}

export async function getSellerWebBanners(placement?: BannerPlacement) {
  await delay(80);
  return filterSellerWeb(records, placement);
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
