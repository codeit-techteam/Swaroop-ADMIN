import { delay } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import type { Seller } from "@/types";

export const sellerService = {
  async getSellers() {
    await delay();
    return useDataStore.getState().sellers;
  },
  async getSellerById(id: string) {
    await delay();
    return useDataStore.getState().sellers.find((item) => item.id === id) ?? null;
  },
  async updateSeller(id: string, patch: Partial<Seller>) {
    await delay(180);
    useDataStore.getState().updateSeller(id, patch);
    return useDataStore.getState().sellers.find((item) => item.id === id) ?? null;
  },
};
