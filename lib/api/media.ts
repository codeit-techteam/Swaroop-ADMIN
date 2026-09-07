import { mediaAssets as seedMedia } from "@/lib/mock-data/banners";
import { delay } from "@/lib/utils";
import type { MediaAsset } from "@/types/banner";

let records: MediaAsset[] = structuredClone(seedMedia);

function nextMediaId() {
  const nums = records
    .map((item) => Number(item.id.replace("MED-", "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `MED-${max + 1}`;
}

export function getMediaSync(): MediaAsset[] {
  return structuredClone(records);
}

export async function getMedia(): Promise<MediaAsset[]> {
  await delay(240);
  return structuredClone(records);
}

export async function createMedia(
  input: Omit<MediaAsset, "id" | "uploadedAt">,
): Promise<MediaAsset> {
  await delay(220);
  const asset: MediaAsset = {
    ...input,
    id: nextMediaId(),
    uploadedAt: new Date().toISOString(),
  };
  records = [asset, ...records];
  return structuredClone(asset);
}

export async function deleteMedia(id: string): Promise<void> {
  await delay(180);
  records = records.filter((item) => item.id !== id);
}

export async function attachMediaUsage(id: string, bannerName: string): Promise<MediaAsset | undefined> {
  const item = records.find((asset) => asset.id === id);
  if (!item) return undefined;
  if (!item.usedIn.includes(bannerName)) item.usedIn = [...item.usedIn, bannerName];
  return structuredClone(item);
}

export const mediaApi = {
  getMedia,
  getMediaSync,
  createMedia,
  deleteMedia,
  attachMediaUsage,
};
