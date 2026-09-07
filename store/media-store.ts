"use client";

import { create } from "zustand";

import { mediaApi } from "@/lib/api/media";
import { useAuthStore } from "@/store/auth-store";
import type { MediaAsset, MediaType } from "@/types/banner";

type MediaFilters = {
  search: string;
  type: MediaType | "ALL";
};

interface MediaState {
  assets: MediaAsset[];
  loadStatus: "idle" | "loading" | "success" | "error";
  filters: MediaFilters;
  view: "grid" | "list";
  fetchMedia: () => Promise<void>;
  uploadMedia: (file: File, previewUrl: string, dimensions?: { width: number; height: number }) => Promise<MediaAsset>;
  deleteMedia: (id: string) => Promise<void>;
  setFilters: (filters: Partial<MediaFilters>) => void;
  setView: (view: "grid" | "list") => void;
}

function mimeToType(mime: string): MediaType {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  return "OTHER";
}

export const useMediaStore = create<MediaState>((set) => ({
  assets: mediaApi.getMediaSync(),
  loadStatus: "success",
  filters: { search: "", type: "ALL" },
  view: "grid",

  fetchMedia: async () => {
    set({ loadStatus: "loading" });
    try {
      const assets = await mediaApi.getMedia();
      set({ assets, loadStatus: "success" });
    } catch {
      set({ loadStatus: "error" });
    }
  },

  uploadMedia: async (file, previewUrl, dimensions) => {
    const actor = useAuthStore.getState().user?.name ?? "Admin";
    const created = await mediaApi.createMedia({
      fileName: file.name,
      type: mimeToType(file.type),
      mimeType: file.type || "image/svg+xml",
      url: previewUrl,
      width: dimensions?.width,
      height: dimensions?.height,
      usedIn: [],
      uploadedBy: actor,
    });
    set((s) => ({ assets: [created, ...s.assets] }));
    return created;
  },

  deleteMedia: async (id) => {
    await mediaApi.deleteMedia(id);
    set((s) => ({ assets: s.assets.filter((item) => item.id !== id) }));
  },

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setView: (view) => set({ view }),
}));
