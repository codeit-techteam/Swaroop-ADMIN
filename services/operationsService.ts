import { delay } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import { useProcurementStore } from "@/store/procurement-store";
import type { Dispute, KycRecord, PlatformDocument, Procurement, Shipment } from "@/types";

export const procurementService = {
  async getQueue() {
    await delay();
    return useProcurementStore.getState().procurements;
  },
  async getRequests() {
    await delay();
    return useDataStore.getState().requests;
  },
  async getProcurementById(id: string) {
    await delay();
    return useProcurementStore.getState().procurements.find((item) => item.id === id) ?? null;
  },
  async updateItem(id: string, patch: Partial<Procurement>) {
    await delay(180);
    useProcurementStore.getState().updateProcurement(id, patch);
  },
  async createPo(item: Procurement) {
    await delay(180);
    useProcurementStore.getState().createPurchaseOrder(item.id, {
      poNumber: item.poNumber ?? item.id,
      sellerName: item.sellerName ?? item.supplier,
      sellerId: item.sellerId,
      customerName: item.customerName,
      commodity: item.commodity,
      grade: item.grade,
      quantity: item.quantity,
      price: item.negotiatedPrice ?? Math.round(item.estimatedCost / Math.max(item.quantity, 1)),
      deliveryLocation: item.deliveryLocation,
      paymentTerms: item.paymentTerms,
      expectedDelivery: item.requiredDeliveryDate,
      remarks: item.remarks,
    });
  },
  async approveProcurement(id: string) {
    await delay(180);
    useProcurementStore.getState().approveProcurement(id);
  },
  async rejectProcurement(id: string, reason: string) {
    await delay(180);
    useProcurementStore.getState().rejectProcurement(id, reason);
  },
  async createDispatch(
    id: string,
    input: {
      vehicle: string;
      driver: string;
      loadingLocation: string;
      destination: string;
      dispatchDate: string;
      expectedArrival: string;
    },
  ) {
    await delay(180);
    useProcurementStore.getState().createDispatch(id, input);
  },
  async updateShipmentStatus(id: string, status: NonNullable<Procurement["shipment"]>["status"]) {
    await delay(180);
    useProcurementStore.getState().updateShipment(id, status);
  },
};

export const shipmentService = {
  async getShipments() {
    await delay();
    return useDataStore.getState().shipments;
  },
  async updateShipment(id: string, patch: Partial<Shipment>) {
    await delay(180);
    useDataStore.getState().updateShipment(id, patch);
  },
};

export const disputeService = {
  async getDisputes() {
    await delay();
    return useDataStore.getState().disputes;
  },
  async updateDispute(id: string, patch: Partial<Dispute>) {
    await delay(180);
    useDataStore.getState().updateDispute(id, patch);
  },
};

export const kycService = {
  async getRecords() {
    await delay();
    return useDataStore.getState().kyc;
  },
  async updateKyc(id: string, patch: Partial<KycRecord>) {
    await delay(180);
    useDataStore.getState().updateKyc(id, patch);
  },
};

export const documentService = {
  async getDocuments() {
    await delay();
    return useDataStore.getState().documents;
  },
  async updateDocument(id: string, patch: Partial<PlatformDocument>) {
    await delay(180);
    useDataStore.getState().updateDocument(id, patch);
  },
};

export const notificationService = {
  async getNotifications() {
    await delay();
    return useDataStore.getState().notifications;
  },
  markRead(id: string) {
    useDataStore.getState().markNotificationRead(id);
  },
  markAllRead() {
    useDataStore.getState().markAllNotificationsRead();
  },
};
