import { delay } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import type { Offer, Order, Payment, PlatformUser, ProductGrade } from "@/types";

export const userService = {
  async getUsers() {
    await delay();
    return useDataStore.getState().users;
  },
  async updateUser(id: string, patch: Partial<PlatformUser>) {
    await delay(180);
    useDataStore.getState().updateUser(id, patch);
  },
};

export const orderService = {
  async getOrders() {
    await delay();
    return useDataStore.getState().orders;
  },
  async getOrderById(id: string) {
    await delay();
    return useDataStore.getState().orders.find((item) => item.id === id) ?? null;
  },
  async updateOrder(id: string, patch: Partial<Order>) {
    await delay(180);
    useDataStore.getState().updateOrder(id, patch);
  },
};

export const offerService = {
  async getOffers() {
    await delay();
    return useDataStore.getState().offers;
  },
  async updateOffer(id: string, patch: Partial<Offer>) {
    await delay(180);
    useDataStore.getState().updateOffer(id, patch);
  },
};

export const paymentService = {
  async getPayments() {
    await delay();
    return useDataStore.getState().payments;
  },
  async updatePayment(id: string, patch: Partial<Payment>) {
    await delay(180);
    useDataStore.getState().updatePayment(id, patch);
  },
};

export const catalogService = {
  async getProducts() {
    await delay();
    return useDataStore.getState().products;
  },
  async updateProduct(id: string, patch: Partial<ProductGrade>) {
    await delay(180);
    useDataStore.getState().updateProduct(id, patch);
  },
  async createProduct(product: ProductGrade) {
    await delay(180);
    useDataStore.getState().addProduct(product);
  },
};
