"use client";

import { create } from "zustand";

import type {
  AuditLog,
  CreditAccount,
  Customer,
  Dispute,
  KycRecord,
  NotificationItem,
  Offer,
  Order,
  Payment,
  PlatformDocument,
  PlatformUser,
  ProcurementItem,
  ProductGrade,
  PurchaseRequest,
  Receivable,
  Seller,
  Shipment,
} from "@/types";

interface DataState {
  customers: Customer[];
  sellers: Seller[];
  users: PlatformUser[];
  products: ProductGrade[];
  offers: Offer[];
  orders: Order[];
  payments: Payment[];
  procurement: ProcurementItem[];
  requests: PurchaseRequest[];
  shipments: Shipment[];
  disputes: Dispute[];
  kyc: KycRecord[];
  credit: CreditAccount[];
  receivables: Receivable[];
  notifications: NotificationItem[];
  documents: PlatformDocument[];
  auditLogs: AuditLog[];
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  updateSeller: (id: string, patch: Partial<Seller>) => void;
  updateUser: (id: string, patch: Partial<PlatformUser>) => void;
  updateProduct: (id: string, patch: Partial<ProductGrade>) => void;
  addProduct: (product: ProductGrade) => void;
  updateOffer: (id: string, patch: Partial<Offer>) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  updateProcurement: (id: string, patch: Partial<ProcurementItem>) => void;
  addProcurement: (item: ProcurementItem) => void;
  updateShipment: (id: string, patch: Partial<Shipment>) => void;
  updateDispute: (id: string, patch: Partial<Dispute>) => void;
  updateKyc: (id: string, patch: Partial<KycRecord>) => void;
  updateDocument: (id: string, patch: Partial<PlatformDocument>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  pushNotification: (item: Omit<NotificationItem, "id" | "createdAt" | "read">) => void;
  addShipment: (item: Shipment) => void;
  pushAudit: (log: Omit<AuditLog, "id" | "timestamp" | "source">) => void;
}

function patchById<T extends { id: string }>(items: T[], id: string, patch: Partial<T>) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export const useDataStore = create<DataState>((set) => ({
  customers: [],
  sellers: [],
  users: [],
  products: [],
  offers: [],
  orders: [],
  payments: [],
  procurement: [],
  requests: [],
  shipments: [],
  disputes: [],
  kyc: [],
  credit: [],
  receivables: [],
  notifications: [],
  documents: [],
  auditLogs: [],
  updateCustomer: (id, patch) => set((s) => ({ customers: patchById(s.customers, id, patch) })),
  updateSeller: (id, patch) => set((s) => ({ sellers: patchById(s.sellers, id, patch) })),
  updateUser: (id, patch) => set((s) => ({ users: patchById(s.users, id, patch) })),
  updateProduct: (id, patch) => set((s) => ({ products: patchById(s.products, id, patch) })),
  addProduct: (product) => set((s) => ({ products: [product, ...s.products] })),
  updateOffer: (id, patch) => set((s) => ({ offers: patchById(s.offers, id, patch) })),
  updateOrder: (id, patch) => set((s) => ({ orders: patchById(s.orders, id, patch) })),
  updatePayment: (id, patch) => set((s) => ({ payments: patchById(s.payments, id, patch) })),
  updateProcurement: (id, patch) =>
    set((s) => ({ procurement: patchById(s.procurement, id, patch) })),
  addProcurement: (item) => set((s) => ({ procurement: [item, ...s.procurement] })),
  updateShipment: (id, patch) => set((s) => ({ shipments: patchById(s.shipments, id, patch) })),
  addShipment: (item) => set((s) => ({ shipments: [item, ...s.shipments] })),
  updateDispute: (id, patch) => set((s) => ({ disputes: patchById(s.disputes, id, patch) })),
  updateKyc: (id, patch) => set((s) => ({ kyc: patchById(s.kyc, id, patch) })),
  updateDocument: (id, patch) => set((s) => ({ documents: patchById(s.documents, id, patch) })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item,
      ),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((item) => ({ ...item, read: true })),
    })),
  pushNotification: (item) =>
    set((s) => ({
      notifications: [
        {
          id: `NTF-${Date.now()}`,
          createdAt: new Date().toISOString(),
          read: false,
          ...item,
        },
        ...s.notifications,
      ],
    })),
  pushAudit: (log) =>
    set((s) => ({
      auditLogs: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: new Date().toISOString(),
          source: "Admin Portal",
          ...log,
        },
        ...s.auditLogs,
      ],
    })),
}));
