import { ApiError, apiRequest } from "@/lib/api/client";

export interface DashboardOperations {
  customers: { total: number; active: number; pendingKyc: number; suspended: number };
  sellers: { total: number; active: number; pendingApproval: number; suspended: number };
  orders: {
    total: number;
    created: number;
    processing: number;
    dispatched: number;
    delivered: number;
    cancelled: number;
  };
  purchaseRequests: {
    total: number;
    created: number;
    pendingSellerResponse: number;
    accepted: number;
    rejected: number;
    counterOffered: number;
    expired: number;
  };
  importTrading: {
    activeBuyRequests: number;
    activeSellOffers: number;
    openNegotiations: number;
    confirmedDeals: number;
  };
  payments: {
    pending: number;
    verificationRequired: number;
    success: number;
    failed: number;
    refunded: number;
  };
  logistics: {
    readyForDispatch: number;
    dispatched: number;
    inTransit: number;
    delivered: number;
    delayed: number;
  };
  recentOrders: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    totalAmount: string;
    customer: string;
    createdAt: string;
  }>;
  recentPurchaseRequests: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    createdAt: string;
  }>;
}

export interface AdminDashboardSummary {
  users: number;
  customers: number;
  sellers: number;
  grades: number;
  products: number;
  offers: number;
  purchaseRequests: number;
  purchaseOrders: number;
  payments: number;
  shipments: number;
  documentsPending: number;
  notificationsUnread: number;
  windowDays: number | null;
  credit: {
    pendingApplications: number;
    approvedAccounts: number;
    outstandingAmount: string;
    overdueAmount: string;
    approvedLimit: string;
  };
  operations: DashboardOperations;
}

export async function getAdminDashboard(days?: number) {
  const query = days ? `?days=${days}` : "";
  const { data } = await apiRequest<AdminDashboardSummary>(`/admin/dashboard/summary${query}`, {
    signal: AbortSignal.timeout(20000),
  });
  return data;
}

export interface AdminSearchResult {
  users: Array<{ id: string; email: string | null; firstName: string | null; lastName: string | null; status: string }>;
  customers: Array<{ id: string; status: string; organization: { name: string } | null; user: { email: string | null } | null }>;
  sellers: Array<{ id: string; status: string; organization: { name: string } | null; user: { email: string | null } | null }>;
  grades: Array<{ id: string; code: string; name: string; displayName: string | null }>;
  products: Array<{ id: string; code: string; name: string; status: string }>;
  offers: Array<{ id: string; referenceNumber: string; status: string; basePrice: string }>;
  purchaseRequests: Array<{ id: string; referenceNumber: string; status: string }>;
  purchaseOrders: Array<{ id: string; referenceNumber: string; status: string }>;
  payments: Array<{ id: string; referenceNumber: string; status: string; amount: string }>;
  shipments: Array<{ id: string; referenceNumber: string; ewayBillNumber: string | null; status: string }>;
  importDeals: Array<{ id: string; referenceNumber: string; status: string; currencyCode: string }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string; totalAmount: string }>;
  documents: Array<{
    id: string;
    documentNumber: string | null;
    fileName: string;
    originalFileName: string | null;
    category: string;
    status: string;
    ownerType: string;
  }>;
  vehicles: Array<{ id: string; numberPlate: string; type: string; status: string }>;
  drivers: Array<{ id: string; name: string; licenseNumber: string | null; status: string }>;
}

export async function searchAdmin(query: string) {
  const { data } = await apiRequest<AdminSearchResult>(
    `/admin/search?q=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(15000) },
  );
  return data;
}

export interface RelatedRecord {
  id: string;
  referenceNumber?: string;
  status?: string;
  createdAt?: string;
  totalAmount?: string;
  amount?: string;
  fileName?: string;
  originalFileName?: string;
  category?: string;
  documentNumber?: string | null;
  action?: string;
  title?: string | null;
  isPrimary?: boolean;
  assignedAt?: string;
  quantity?: string;
  basePrice?: string;
  type?: string;
  label?: string | null;
  line1?: string;
  city?: string;
  state?: string;
  formattedAddress?: string | null;
  isDefault?: boolean;
  user?: { id: string; email: string | null; firstName: string | null; lastName: string | null; status: string };
  actor?: { email: string | null; firstName: string | null; lastName: string | null } | null;
}

export interface Customer360 {
  id: string;
  status: string;
  creditStatus?: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    status: string;
  };
  organization: {
    id: string;
    name: string;
    legalName: string | null;
    gstin: string | null;
    pan: string | null;
    verificationStatus: string | null;
    status: string;
  };
  _count?: { purchaseRequests: number; orders: number };
  related: {
    addresses: RelatedRecord[];
    purchaseRequests: RelatedRecord[];
    orders: RelatedRecord[];
    payments: RelatedRecord[];
    documents: RelatedRecord[];
    importDeals: RelatedRecord[];
    audit: RelatedRecord[];
  };
}

export interface Seller360 {
  id: string;
  status: string;
  createdAt: string;
  user: Customer360["user"];
  organization: Customer360["organization"];
  onboarding?: { status: string; currentStep: string | null; submittedAt: string | null } | null;
  _count?: { products: number; offers: number; inventory: number; orders: number };
  onboardingDocuments?: Array<{ id: string; fileName: string; status: string; category: string; slot: string | null }>;
  related: {
    orders: RelatedRecord[];
    offers: RelatedRecord[];
    dispatches: RelatedRecord[];
    managers: RelatedRecord[];
    importDeals: RelatedRecord[];
    audit: RelatedRecord[];
  };
}

export async function getAdminCustomer(id: string) {
  const { data } = await apiRequest<Customer360>(`/admin/customers/${id}`, {
    signal: AbortSignal.timeout(20000),
  });
  return data;
}

export async function getAdminSeller(id: string) {
  const { data } = await apiRequest<Seller360>(`/admin/sellers/${id}`, {
    signal: AbortSignal.timeout(20000),
  });
  return data;
}

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  ipAddress?: string | null;
  actor?: { email: string | null; firstName: string | null; lastName: string | null } | null;
}

export async function listAuditLogs(params: { page?: number; limit?: number; search?: string; entityType?: string }) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 25));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.entityType) query.set("entityType", params.entityType);
  const { data, meta } = await apiRequest<AuditLogRow[]>(`/admin/audit-logs?${query.toString()}`, {
    signal: AbortSignal.timeout(20000),
  });
  return { items: data ?? [], meta };
}

export function describeApiFailure(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your admin session expired. Sign in again.";
    if (error.status === 403) return "You do not have permission to view this data.";
    if (error.status === 404) return "This record was not found.";
    return error.message;
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "The backend did not respond in time.";
  }
  if (error instanceof TypeError) return "Network error. Check that the backend is reachable.";
  return error instanceof Error ? error.message : "Unable to load data.";
}
