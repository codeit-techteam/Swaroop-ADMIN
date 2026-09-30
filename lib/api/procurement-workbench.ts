import { ApiError, apiRequest } from "@/lib/api/client";

export type WorkbenchBucket =
  | "all"
  | "needs_action"
  | "negotiation"
  | "urgent"
  | "pending_invoice"
  | "approved"
  | "pending_approvals"
  | "pending_seller"
  | "open_po";

export interface ProcurementListQuery {
  page?: number;
  limit?: number;
  search?: string;
  bucket?: WorkbenchBucket;
  status?: string;
  priority?: string;
  customer?: string;
  seller?: string;
  paymentOption?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "updatedAt" | "referenceNumber" | "priority";
  sortOrder?: "asc" | "desc";
}

export interface ProcurementOps {
  statusLabel: string;
  actionRequired: boolean;
  actionType: string | null;
  actionReason: string | null;
  urgent: boolean;
  deadlineLabel: string | null;
  customerName: string;
  sellerName: string | null;
  gradeName: string;
  productName: string;
  quantity: string;
  unit: string;
  unitPrice: string | null;
  totalAmount: string | null;
  paymentTerms: string | null;
  poNumber: string | null;
  poStatus: string | null;
  poStatusLabel: string;
  piStatus: string | null;
  piStatusLabel: string;
  paymentStatusLabel: string;
}

export interface ProcurementParty {
  id: string;
  name: string;
  code: string | null;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  verificationStatus?: string | null;
  sellerProfile?: {
    id: string;
    status: string;
    kycStatus: string | null;
    user: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
    } | null;
  } | null;
}

export interface ProcurementRecord {
  id: string;
  referenceNumber: string;
  status: string;
  priority: string;
  paymentMethod: string | null;
  currency: string;
  requiredByDate: string | null;
  destinationRegion: string | null;
  deliveryLocation: string | null;
  shippingAddressSnapshot: Record<string, unknown> | null;
  billingAddressSnapshot: Record<string, unknown> | null;
  notes: string | null;
  rejectionReason: string | null;
  responseDeadline: string | null;
  remainingSeconds: number | null;
  commerciallyAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customerOrg: ProcurementParty | null;
  sellerOrg: ProcurementParty | null;
  customerProfile: {
    id: string;
    status: string;
    user: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
    } | null;
  } | null;
  items: Array<{
    id: string;
    quantity: string;
    unit: string;
    targetUnitPrice: string | null;
    unitPriceSnapshot: string | null;
    grade: { id: string; code: string; name: string; displayName: string | null };
    product: { id: string; code: string; name: string } | null;
  }>;
  counterOffers: Array<{
    id: string;
    roundNumber: number;
    role: string;
    unitPrice: string;
    quantity: string;
    paymentMethod: string | null;
    status: string;
    note: string | null;
    createdAt: string;
  }>;
  purchaseOrder: {
    id: string;
    referenceNumber: string;
    status: string;
    subtotal: string;
    taxAmount: string;
    totalAmount: string;
    paymentMethod: string | null;
    orderedQuantity: string | null;
    confirmedAt: string | null;
    createdAt: string;
    shippingAddressSnapshot: Record<string, unknown> | null;
  } | null;
  finance: {
    proforma: {
      id: string;
      piNumber: string;
      status: string;
      statusLabel: string;
      totalAmount: string | null;
      paidAmount: string | null;
      remainingAmount: string | null;
      dueDate: string | null;
      currency: string;
    } | null;
    dispatch: { id: string; dispatchNumber: string; status: string } | null;
    shipment: { id: string; referenceNumber: string; status: string; eta: string | null } | null;
    ewayBill: { id: string; ewayBillNumber: string; status: string } | null;
  };
  ops: ProcurementOps;
  eventCount: number;
}

export interface ProcurementSummary {
  total: number;
  pendingApprovals: number;
  pendingSellerResponses: number;
  activeNegotiations: number;
  openPoValue: string;
  counts: {
    all: number;
    needsAction: number;
    negotiation: number;
    urgent: number;
    pendingInvoice: number;
    approved: number;
    pendingApprovals: number;
    pendingSellerResponses: number;
  };
}

export interface ProcurementActivityItem {
  id: string;
  type: string;
  message: string;
  actorName: string;
  actorRole: string | null;
  referenceNumber: string;
  purchaseRequestId: string;
  createdAt: string;
}

export interface ProcurementQueueGroup {
  key: WorkbenchBucket;
  label: string;
  count: number;
  items: ProcurementRecord[];
}

export interface ProcurementTimelineEvent {
  id: string;
  eventType: string;
  actorRole: string | null;
  actorUserId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

function toQuery(query: ProcurementListQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== "all") {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export async function getProcurementSummary() {
  const { data } = await apiRequest<ProcurementSummary>("/admin/procurement/summary");
  return data;
}

export async function listProcurementRecords(query: ProcurementListQuery) {
  const result = await apiRequest<ProcurementRecord[]>(
    `/admin/procurement/purchase-requests${toQuery(query)}`,
  );
  return {
    items: result.data,
    meta: result.meta ?? { page: 1, limit: 25, total: result.data.length, totalPages: 1 },
  };
}

export async function getProcurementRecord(id: string) {
  const { data } = await apiRequest<ProcurementRecord>(`/admin/procurement/purchase-requests/${id}`);
  return data;
}

export async function getProcurementTimeline(id: string) {
  const { data } = await apiRequest<{ purchaseRequestId: string; events: ProcurementTimelineEvent[] }>(
    `/admin/procurement/purchase-requests/${id}/timeline`,
  );
  return data.events;
}

export async function getProcurementActivity(limit = 12) {
  const { data } = await apiRequest<{ items: ProcurementActivityItem[] }>(
    `/admin/procurement/activity?limit=${limit}`,
  );
  return data.items;
}

export async function getProcurementQueue() {
  const { data } = await apiRequest<{ groups: ProcurementQueueGroup[] }>("/admin/procurement/queue");
  return data.groups;
}

export async function exportProcurement(query: ProcurementListQuery) {
  const { data } = await apiRequest<{ filename: string; csv: string; rowCount: number }>(
    `/admin/procurement/export${toQuery({ ...query, page: undefined, limit: undefined })}`,
  );
  return data;
}

export async function markProcurementReviewed(id: string, expectedUpdatedAt: string) {
  const { data } = await apiRequest<ProcurementRecord>(
    `/admin/procurement/purchase-requests/${id}/mark-review`,
    { method: "POST", body: JSON.stringify({ expectedUpdatedAt }) },
  );
  return data;
}

export async function escalateProcurement(id: string, expectedUpdatedAt: string) {
  const { data } = await apiRequest<ProcurementRecord>(
    `/admin/procurement/purchase-requests/${id}/escalate`,
    { method: "POST", body: JSON.stringify({ expectedUpdatedAt }) },
  );
  return data;
}

export async function cancelProcurement(id: string, reason: string, expectedUpdatedAt: string) {
  const { data } = await apiRequest<ProcurementRecord>(
    `/admin/procurement/purchase-requests/${id}/cancel`,
    { method: "POST", body: JSON.stringify({ reason, expectedUpdatedAt }) },
  );
  return data;
}

export async function recordProcurementView(id: string) {
  await apiRequest(`/admin/procurement/purchase-requests/${id}/viewed`, { method: "POST" });
}

export function procurementErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your admin session has expired. Sign in again.";
    if (error.status === 403) return "You do not have permission to perform this procurement action.";
    if (error.status === 404) return "This procurement record is no longer available.";
    if (error.status === 409) {
      return "This procurement has already been updated by another user. Refresh and review the latest status.";
    }
    if (error.status === 422 || error.status === 400) {
      return typeof error.message === "string" ? error.message : fallback;
    }
    if (error.status === 429) return "Too many requests. Wait a moment and try again.";
    if (error.status >= 500) return "The procurement service is unavailable. Try again shortly.";
    return error.message || fallback;
  }
  return fallback;
}
