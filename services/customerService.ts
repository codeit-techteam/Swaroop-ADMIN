import { delay } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import type { Customer } from "@/types";

export const customerService = {
  async getCustomers() {
    await delay();
    return useDataStore.getState().customers;
  },
  async getCustomerById(id: string) {
    await delay();
    return useDataStore.getState().customers.find((item) => item.id === id) ?? null;
  },
  async updateCustomer(id: string, patch: Partial<Customer>) {
    await delay(180);
    useDataStore.getState().updateCustomer(id, patch);
    return useDataStore.getState().customers.find((item) => item.id === id) ?? null;
  },
};
