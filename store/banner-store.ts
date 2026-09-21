"use client";

import { create } from "zustand";

import * as bannerApi from "@/lib/api/banners";
import { mediaApi } from "@/lib/api/media";
import { deriveBannerStatus } from "@/lib/banner-utils";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import { useMediaStore } from "@/store/media-store";
import type {
  Banner,
  BannerAuditEvent,
  BannerFilters,
  BannerInput,
  BannerPriority,
  BannerSaveAction,
} from "@/types/banner";
import { EMPTY_BANNER_FILTERS } from "@/types/banner";

type LoadStatus = "idle" | "loading" | "success" | "error";

type BannerUi = {
  selectedBannerId: string | null;
  selectedBannerIds: string[];
  filters: BannerFilters;
  isCreateOpen: boolean;
  isEditOpen: boolean;
  isPreviewOpen: boolean;
  isDetailsOpen: boolean;
  previewBannerId: string | null;
};

interface BannerState extends BannerUi {
  banners: Banner[];
  auditEvents: BannerAuditEvent[];
  loadStatus: LoadStatus;
  loadError: string | null;

  selectedBanner: () => Banner | null;
  filteredBanners: () => Banner[];

  fetchBanners: () => Promise<void>;
  addBanner: (input: BannerInput, action: BannerSaveAction) => Promise<Banner>;
  updateBanner: (id: string, patch: Partial<Banner>, message?: string) => Promise<Banner>;
  saveBanner: (id: string, input: BannerInput, action: BannerSaveAction) => Promise<Banner>;
  deleteBanner: (id: string) => Promise<void>;
  duplicateBanner: (id: string) => Promise<Banner>;
  activateBanner: (id: string) => Promise<Banner>;
  pauseBanner: (id: string) => Promise<Banner>;
  resumeBanner: (id: string) => Promise<Banner>;
  bulkDelete: (ids?: string[]) => Promise<void>;
  bulkActivate: (ids?: string[]) => Promise<void>;
  bulkPause: (ids?: string[]) => Promise<void>;
  bulkChangePriority: (priority: BannerPriority, ids?: string[]) => Promise<void>;

  setSelectedBanner: (id: string | null) => void;
  setSelectedBannerIds: (ids: string[]) => void;
  toggleBannerSelection: (id: string) => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<BannerFilters>) => void;
  clearFilters: () => void;
  setCreateOpen: (open: boolean) => void;
  setEditOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean, id?: string | null) => void;
  setDetailsOpen: (open: boolean) => void;
}

function actor() {
  return useAuthStore.getState().user?.name ?? "Admin";
}

function role() {
  return useAuthStore.getState().user?.role ?? "ADMIN";
}

function pushPlatformAudit(action: string, entityId: string) {
  useDataStore.getState().pushAudit({
    admin: actor(),
    role: role(),
    action,
    module: "Content",
    entity: entityId,
    result: "Success",
  });
}

function pushContentNotification(title: string, body: string, href = "/content/banners") {
  useDataStore.getState().pushNotification({
    type: "Content",
    title,
    body,
    href,
    source: "Admin Portal",
  });
}

function recordEvent(set: (fn: (s: BannerState) => Partial<BannerState>) => void, action: string, entityId: string) {
  const event: BannerAuditEvent = {
    id: `BAUD-${Date.now()}`,
    action,
    entityType: "BANNER",
    entityId,
    performedBy: actor(),
    timestamp: new Date().toISOString(),
  };
  set((s) => ({ auditEvents: [event, ...s.auditEvents] }));
  pushPlatformAudit(action, entityId);
}

function applySaveAction(input: BannerInput, action: BannerSaveAction): BannerInput {
  if (action === "draft") return { ...input, status: "DRAFT" };
  if (input.status === "PAUSED") return { ...input, status: "PAUSED" };
  if (action === "schedule") return { ...input, status: "SCHEDULED" };
  const now = new Date();
  const start = new Date(`${input.startDate}T${input.startTime || "00:00"}:00+05:30`);
  const activated: BannerInput = { ...input, status: "ACTIVE" };
  if (start > now) {
    activated.startDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    activated.startTime = now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
  } else {
    const derived = deriveBannerStatus(activated);
    activated.status = derived === "EXPIRED" ? "ACTIVE" : derived;
  }
  return activated;
}

async function syncMediaUsage(banner: Banner) {
  if (banner.desktopMediaId) await mediaApi.attachMediaUsage(banner.desktopMediaId, banner.name);
  if (banner.mobileMediaId) await mediaApi.attachMediaUsage(banner.mobileMediaId, banner.name);
}

function slugName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "banner";
}

async function ensureMediaAssets(input: BannerInput): Promise<BannerInput> {
  const next = { ...input };
  const uploadedBy = actor();
  if (next.desktopImage && !next.desktopMediaId) {
    const asset = await mediaApi.createMedia({
      fileName: `${slugName(next.name)}-desktop.svg`,
      type: "IMAGE",
      mimeType: "image/svg+xml",
      url: next.desktopImage,
      usedIn: [next.name],
      uploadedBy,
    });
    next.desktopMediaId = asset.id;
    useMediaStore.setState((s) => ({ assets: [asset, ...s.assets] }));
  }
  if (next.mobileImage && !next.mobileMediaId) {
    const asset = await mediaApi.createMedia({
      fileName: `${slugName(next.name)}-mobile.svg`,
      type: "IMAGE",
      mimeType: "image/svg+xml",
      url: next.mobileImage,
      usedIn: [next.name],
      uploadedBy,
    });
    next.mobileMediaId = asset.id;
    useMediaStore.setState((s) => ({ assets: [asset, ...s.assets] }));
  }
  return next;
}

export const useBannerStore = create<BannerState>((set, get) => ({
  banners: [],
  auditEvents: [],
  loadStatus: "idle",
  loadError: null,
  selectedBannerId: null,
  selectedBannerIds: [],
  filters: { ...EMPTY_BANNER_FILTERS },
  isCreateOpen: false,
  isEditOpen: false,
  isPreviewOpen: false,
  isDetailsOpen: false,
  previewBannerId: null,

  selectedBanner: () => {
    const { banners, selectedBannerId } = get();
    return banners.find((item) => item.id === selectedBannerId) ?? null;
  },

  filteredBanners: () => get().banners,

  fetchBanners: async () => {
    if (get().banners.length === 0) set({ loadStatus: "loading", loadError: null });
    else set({ loadError: null });
    try {
      const banners = await bannerApi.getBanners();
      set({ banners, loadStatus: "success" });
    } catch {
      set({ loadStatus: "error", loadError: "Unable to load banners." });
    }
  },

  addBanner: async (input, action) => {
    const payload = applySaveAction(await ensureMediaAssets(input), action);
    const created = await bannerApi.createBanner(payload, actor());
    await syncMediaUsage(created);
    set((s) => ({ banners: [created, ...s.banners], isCreateOpen: false }));
    const verb =
      action === "draft" ? "saved as draft" : action === "schedule" ? "scheduled" : "activated";
    recordEvent(set, `Admin created banner ${created.name}`, created.id);
    pushContentNotification(`Banner ${verb}`, `${created.name} was ${verb}.`);
    return created;
  },

  updateBanner: async (id, patch, message) => {
    const updated = await bannerApi.updateBanner(id, patch);
    set((s) => ({
      banners: s.banners.map((item) => (item.id === id ? updated : item)),
    }));
    recordEvent(set, message ?? `Admin updated banner ${updated.name}`, id);
    return updated;
  },

  saveBanner: async (id, input, action) => {
    const payload = applySaveAction(await ensureMediaAssets(input), action);
    const updated = await bannerApi.updateBanner(id, payload);
    await syncMediaUsage(updated);
    set((s) => ({
      banners: s.banners.map((item) => (item.id === id ? updated : item)),
      isEditOpen: false,
    }));
    const verb =
      action === "draft" ? "saved as draft" : action === "schedule" ? "scheduled" : "activated";
    recordEvent(set, `Admin updated banner ${updated.name}`, id);
    pushContentNotification(`Banner ${verb}`, `${updated.name} was ${verb}.`);
    return updated;
  },

  deleteBanner: async (id) => {
    const current = get().banners.find((item) => item.id === id);
    await bannerApi.deleteBanner(id);
    set((s) => ({
      banners: s.banners.filter((item) => item.id !== id),
      selectedBannerIds: s.selectedBannerIds.filter((item) => item !== id),
      selectedBannerId: s.selectedBannerId === id ? null : s.selectedBannerId,
      isDetailsOpen: s.selectedBannerId === id ? false : s.isDetailsOpen,
    }));
    recordEvent(set, `Admin deleted banner ${current?.name ?? id}`, id);
    pushContentNotification("Banner deleted successfully.", `${current?.name ?? id} was removed.`);
  },

  duplicateBanner: async (id) => {
    const created = await bannerApi.duplicateBanner(id, actor());
    set((s) => ({ banners: [created, ...s.banners] }));
    recordEvent(set, `Admin duplicated banner ${created.name}`, created.id);
    pushContentNotification("Banner duplicated.", `${created.name} was created as a draft.`);
    return created;
  },

  activateBanner: async (id) => {
    const updated = await bannerApi.activateBanner(id);
    set((s) => ({ banners: s.banners.map((item) => (item.id === id ? updated : item)) }));
    recordEvent(set, `Admin activated banner ${updated.name}`, id);
    pushContentNotification("Banner activated successfully.", `${updated.name} is now live.`);
    return updated;
  },

  pauseBanner: async (id) => {
    const updated = await bannerApi.pauseBanner(id);
    set((s) => ({ banners: s.banners.map((item) => (item.id === id ? updated : item)) }));
    recordEvent(set, `Admin paused banner ${updated.name}`, id);
    pushContentNotification("Banner paused.", `${updated.name} is no longer serving.`);
    return updated;
  },

  resumeBanner: async (id) => {
    const updated = await bannerApi.resumeBanner(id);
    set((s) => ({ banners: s.banners.map((item) => (item.id === id ? updated : item)) }));
    recordEvent(set, `Admin resumed banner ${updated.name}`, id);
    pushContentNotification("Banner resumed.", `${updated.name} status is now ${updated.status}.`);
    return updated;
  },

  bulkDelete: async (ids) => {
    const target = ids ?? get().selectedBannerIds;
    await bannerApi.bulkDelete(target);
    set((s) => ({
      banners: s.banners.filter((item) => !target.includes(item.id)),
      selectedBannerIds: [],
    }));
    recordEvent(set, `Admin bulk deleted ${target.length} banners`, target[0] ?? "BANNER");
    pushContentNotification("Banners deleted.", `${target.length} banners were removed.`);
  },

  bulkActivate: async (ids) => {
    const target = ids ?? get().selectedBannerIds;
    const updated = await bannerApi.bulkActivate(target);
    const map = new Map(updated.map((item) => [item.id, item]));
    set((s) => ({
      banners: s.banners.map((item) => map.get(item.id) ?? item),
      selectedBannerIds: [],
    }));
    recordEvent(set, `Admin bulk activated ${target.length} banners`, target[0] ?? "BANNER");
    pushContentNotification("Banners activated.", `${target.length} banners are now live.`);
  },

  bulkPause: async (ids) => {
    const target = ids ?? get().selectedBannerIds;
    const updated = await bannerApi.bulkPause(target);
    const map = new Map(updated.map((item) => [item.id, item]));
    set((s) => ({
      banners: s.banners.map((item) => map.get(item.id) ?? item),
      selectedBannerIds: [],
    }));
    recordEvent(set, `Admin bulk paused ${target.length} banners`, target[0] ?? "BANNER");
    pushContentNotification("Banners paused.", `${target.length} banners were paused.`);
  },

  bulkChangePriority: async (priority, ids) => {
    const target = ids ?? get().selectedBannerIds;
    const updated = await bannerApi.bulkChangePriority(target, priority);
    const map = new Map(updated.map((item) => [item.id, item]));
    set((s) => ({
      banners: s.banners.map((item) => map.get(item.id) ?? item),
      selectedBannerIds: [],
    }));
    recordEvent(set, `Admin changed priority to P${priority} for ${target.length} banners`, target[0] ?? "BANNER");
  },

  setSelectedBanner: (id) => set({ selectedBannerId: id }),
  setSelectedBannerIds: (ids) => set({ selectedBannerIds: ids }),
  toggleBannerSelection: (id) =>
    set((s) => ({
      selectedBannerIds: s.selectedBannerIds.includes(id)
        ? s.selectedBannerIds.filter((item) => item !== id)
        : [...s.selectedBannerIds, id],
    })),
  clearSelection: () => set({ selectedBannerIds: [] }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  clearFilters: () => set({ filters: { ...EMPTY_BANNER_FILTERS } }),
  setCreateOpen: (open) => set({ isCreateOpen: open }),
  setEditOpen: (open) => set({ isEditOpen: open }),
  setPreviewOpen: (open, id) =>
    set({
      isPreviewOpen: open,
      previewBannerId: open ? (id ?? get().selectedBannerId) : null,
    }),
  setDetailsOpen: (open) => set({ isDetailsOpen: open }),
}));
