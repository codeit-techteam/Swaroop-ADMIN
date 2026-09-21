import { apiRequest } from "@/lib/api/client";
import type {
  Customer,
  KycRecord,
  Offer,
  Order,
  Payment,
  PlatformDocument,
  Procurement,
  Seller,
  Shipment,
} from "@/types";

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function iso(value: unknown) {
  if (!value) return new Date().toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function listAll<T>(path: string): Promise<T[]> {
  const pages: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, meta } = await apiRequest<T[]>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&limit=100`);
    pages.push(...(data ?? []));
    totalPages = meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 10);
  return pages;
}

export function mapAdminCustomer(row: Record<string, unknown>): Customer {
  const user = (row.user ?? {}) as Record<string, unknown>;
  const org = (row.organization ?? {}) as Record<string, unknown>;
  const credit = (row.creditProfile ?? {}) as Record<string, unknown>;
  const count = (row._count ?? {}) as Record<string, unknown>;
  const name = String(org.legalName ?? org.name ?? user.displayName ?? "Customer");
  return {
    id: String(row.id),
    company: name,
    contact: [user.firstName, user.lastName].filter(Boolean).join(" ") || name,
    email: String(user.email ?? ""),
    phone: String(user.phone ?? ""),
    location: "India",
    kycStatus: String(org.verificationStatus ?? "Pending") === "VERIFIED" ? "Approved" : "Pending",
    creditLimit: num(credit.approvedLimit),
    usedCredit: num(credit.utilizedAmount ?? credit.outstandingAmount),
    orders: num(count.orders ?? count.purchaseRequests),
    spend: 0,
    status: String(row.status ?? user.status ?? "ACTIVE") === "SUSPENDED" ? "Suspended" : "Active",
    lastActive: iso(row.updatedAt ?? row.createdAt),
    source: "Customer Web",
    gst: String(org.gstin ?? ""),
    pan: String(org.pan ?? ""),
    addresses: [],
  };
}

export function mapAdminSeller(row: Record<string, unknown>): Seller {
  const user = (row.user ?? {}) as Record<string, unknown>;
  const org = (row.organization ?? {}) as Record<string, unknown>;
  const count = (row._count ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    company: String(org.legalName ?? org.name ?? "Seller"),
    contact: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Seller",
    email: String(user.email ?? ""),
    phone: String(user.phone ?? ""),
    location: "India",
    kycStatus: String(org.verificationStatus ?? "Pending") === "VERIFIED" ? "Approved" : "Pending",
    products: num(count.products),
    offers: num(count.offers),
    orders: num(count.orders),
    revenue: 0,
    performance: 0,
    status: String(row.status ?? "ACTIVE") === "SUSPENDED" ? "Suspended" : "Active",
    lastActive: iso(row.updatedAt ?? row.createdAt),
    source: "Seller Web",
    gst: String(org.gstin ?? ""),
    pan: String(org.pan ?? ""),
  };
}

function mapOfferStatus(status?: string): Offer["status"] {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "PAUSED":
      return "Paused";
    case "EXPIRED":
      return "Expired";
    case "REJECTED":
      return "Rejected";
    case "PENDING_REVIEW":
      return "Pending Review";
    default:
      return "Draft";
  }
}

export function mapAdminOffer(row: Record<string, unknown>): Offer {
  const org = (row.organization ?? {}) as Record<string, unknown>;
  const grade = (row.grade ?? {}) as Record<string, unknown>;
  const product = (row.product ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    sellerId: String(row.organizationId ?? org.id ?? ""),
    seller: String(org.legalName ?? org.name ?? "Seller"),
    grade: String(grade.code ?? grade.name ?? product.name ?? "Grade"),
    price: num(row.basePrice),
    bulkPrice: num(row.basePrice),
    quantity: num(row.quantity),
    validity: iso(row.validUntil ?? row.createdAt),
    location: String(row.deliveryTerms ?? "Assigned hub"),
    remarks: String(row.notes ?? ""),
    status: mapOfferStatus(String(row.status ?? "")),
    source: "Seller Web",
    updatedAt: iso(row.updatedAt ?? row.createdAt),
  };
}

function mapOrderStatus(status?: string): Order["status"] {
  const key = (status ?? "").toUpperCase();
  if (key.includes("CANCEL")) return "Cancelled";
  if (key.includes("DELIVER")) return "Delivered";
  if (key.includes("TRANSIT")) return "In Transit";
  if (key.includes("DISPATCH")) return "Dispatched";
  if (key.includes("READY")) return "Ready for Dispatch";
  if (key.includes("PROCESS") || key.includes("CONFIRM")) return "Processing";
  return "Pending";
}

export function mapAdminOrder(row: Record<string, unknown>): Order {
  const customer = (row.customerOrg ?? {}) as Record<string, unknown>;
  const seller = (row.sellerOrg ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    buyerId: String(row.customerOrgId ?? customer.id ?? ""),
    buyer: String(customer.legalName ?? customer.name ?? "Customer"),
    sellerId: String(row.sellerOrgId ?? seller.id ?? ""),
    seller: String(seller.legalName ?? seller.name ?? "Seller"),
    grade: String(row.referenceNumber ?? "PO"),
    quantity: num(row.orderedQuantity),
    value: num(row.totalAmount),
    payment: "Pending",
    dispatch: String(row.status ?? "Pending"),
    shipment: "—",
    status: mapOrderStatus(String(row.status ?? "")),
    source: "Customer Web",
    createdAt: iso(row.createdAt),
  };
}

function mapPaymentStatus(status?: string): Payment["status"] {
  switch (status) {
    case "VERIFIED":
    case "CLEARED":
    case "PAID":
      return "Verified";
    case "FAILED":
      return "Failed";
    case "REFUNDED":
      return "Refunded";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "Processing";
    default:
      return "Pending";
  }
}

export function mapAdminPayment(row: Record<string, unknown>): Payment {
  const customer = (row.organization ?? {}) as Record<string, unknown>;
  const seller = (row.sellerOrg ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    orderId: String(row.purchaseOrderId ?? row.referenceNumber ?? row.id),
    customer: String(customer.legalName ?? customer.name ?? "Customer"),
    seller: String(seller.legalName ?? seller.name ?? "Seller"),
    amount: num(row.amount),
    method: String(row.rail ?? "NEFT") === "UPI" ? "UPI" : String(row.rail ?? "NEFT") === "RTGS" ? "RTGS" : "NEFT",
    transaction: String(row.utr ?? row.referenceNumber ?? row.id),
    date: iso(row.createdAt),
    status: mapPaymentStatus(String(row.status ?? "")),
    source: "Admin Portal",
  };
}

function mapShipmentStatus(status?: string): Shipment["status"] {
  const key = (status ?? "").toUpperCase();
  if (key.includes("DELAY")) return "Delayed";
  if (key.includes("DELIVER")) return "Delivered";
  if (key.includes("TRANSIT")) return "In Transit";
  if (key.includes("LOAD")) return "Loading";
  if (key.includes("DISPATCH")) return "Dispatched";
  return "Scheduled";
}

export function mapAdminShipment(row: Record<string, unknown>): Shipment {
  return {
    id: String(row.id),
    orderId: String(row.purchaseOrderId ?? row.purchaseOrderReference ?? row.id),
    seller: "Seller",
    customer: "Customer",
    grade: String(row.referenceNumber ?? "Shipment"),
    quantity: num(row.quantity),
    vehicle: String(row.vehicleNumber ?? "—"),
    route: String(row.destinationRegion ?? "Assigned route"),
    eta: iso(row.eta ?? row.createdAt),
    status: mapShipmentStatus(String(row.status ?? "")),
    milestone: String(row.status ?? "Scheduled"),
    source: "Admin Portal",
  };
}

export async function listAdminCustomers() {
  const rows = await listAll<Record<string, unknown>>("/admin/customers");
  return rows.map(mapAdminCustomer);
}

export async function listAdminSellers() {
  const rows = await listAll<Record<string, unknown>>("/admin/sellers");
  return rows.map(mapAdminSeller);
}

export async function listAdminOffers() {
  const rows = await listAll<Record<string, unknown>>("/admin/offers");
  return rows.map(mapAdminOffer);
}

export async function approveAdminOffer(id: string) {
  await apiRequest(`/admin/offers/${id}/approve`, { method: "POST", body: JSON.stringify({}) });
}

export async function rejectAdminOffer(id: string, reason = "Rejected by admin") {
  await apiRequest(`/admin/offers/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function suspendAdminOffer(id: string) {
  await apiRequest(`/admin/offers/${id}/suspend`, { method: "POST", body: JSON.stringify({}) });
}

export async function listAdminOrders() {
  const rows = await listAll<Record<string, unknown>>("/admin/purchase-orders");
  return rows.map(mapAdminOrder);
}

export async function listAdminPayments() {
  const rows = await listAll<Record<string, unknown>>("/admin/finance/payments");
  return rows.map(mapAdminPayment);
}

export async function listAdminShipments() {
  const rows = await listAll<Record<string, unknown>>("/admin/logistics/shipments");
  return rows.map(mapAdminShipment);
}

function mapKycStatus(status?: string): KycRecord["status"] {
  switch (status) {
    case "VERIFIED":
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "UNDER_REVIEW":
    case "SUBMITTED":
      return "Under Review";
    case "EXPIRED":
      return "Expired";
    default:
      return "Pending";
  }
}

export function mapAdminKyc(
  row: Record<string, unknown>,
  entityType: KycRecord["entityType"],
): KycRecord {
  const org = (row.organization ?? {}) as Record<string, unknown>;
  const user = (row.user ?? {}) as Record<string, unknown>;
  const verification = (row.verification ?? {}) as Record<string, unknown>;
  const counts = Array.isArray(row.documentCounts)
    ? (row.documentCounts as Array<{ count?: number }>)
    : [];
  const docs = counts.reduce((sum, item) => sum + num(item.count), 0);
  return {
    id: String(row.id ?? row.sellerProfileId ?? org.id ?? ""),
    entity: String(org.legalName ?? org.name ?? user.displayName ?? entityType),
    entityType,
    type: "Company",
    submitted: iso(row.createdAt ?? verification.submittedAt ?? row.updatedAt),
    documents: docs,
    risk: String(org.verificationStatus ?? "") === "REJECTED" ? "High" : "Medium",
    status: mapKycStatus(String(verification.status ?? org.verificationStatus ?? "")),
    reviewer: "Admin",
    gst: String(org.gstin ?? ""),
    pan: String(org.pan ?? ""),
    bank: "",
    notes: String(verification.notes ?? row.notes ?? ""),
    source: entityType === "Seller" ? "Seller Web" : "Customer Web",
  };
}

function mapDocumentCategory(category?: string): PlatformDocument["category"] {
  const key = (category ?? "").toUpperCase();
  if (key.includes("GST")) return "GST";
  if (key.includes("PAN")) return "PAN";
  if (key.includes("BANK")) return "Bank";
  if (key.includes("PO") || key.includes("PURCHASE")) return "Purchase Orders";
  if (key.includes("INVOICE")) return "Invoices";
  if (key.includes("EWAY") || key.includes("E-WAY")) return "E-way Bills";
  if (key.includes("DELIV") || key.includes("POD")) return "Delivery Documents";
  if (key.includes("KYC")) return "KYC";
  return "Compliance";
}

function mapDocumentStatus(status?: string): PlatformDocument["status"] {
  switch (status) {
    case "APPROVED":
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    case "REVISION_REQUESTED":
      return "Revision Requested";
    default:
      return "Pending";
  }
}

export function mapAdminDocument(row: Record<string, unknown>): PlatformDocument {
  const org = (row.organization ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    name: String(row.originalFileName ?? row.fileName ?? row.documentNumber ?? "Document"),
    category: mapDocumentCategory(String(row.category ?? "")),
    entity: String(org.legalName ?? org.name ?? "Organization"),
    uploadedAt: iso(row.createdAt),
    status: mapDocumentStatus(String(row.status ?? "")),
    source: "Admin Portal",
  };
}

function mapProcurementStatus(status?: string): Procurement["status"] {
  const key = (status ?? "").toUpperCase();
  if (key.includes("CANCEL")) return "Cancelled";
  if (key.includes("CONVERT") || key.includes("PO")) return "PO Created";
  if (key.includes("ACCEPT") || key.includes("APPROV")) return "Approved";
  if (key.includes("REJECT")) return "Rejected";
  if (key.includes("NEGOT")) return "Negotiation";
  if (key.includes("REVIEW")) return "Under Review";
  if (key.includes("SUBMIT") || key.includes("OPEN") || key.includes("PENDING")) return "Submitted";
  return "Draft";
}

export function mapAdminProcurement(row: Record<string, unknown>): Procurement {
  const customer = (row.customerOrg ?? {}) as Record<string, unknown>;
  const seller = (row.sellerOrg ?? {}) as Record<string, unknown>;
  const items = Array.isArray(row.items) ? (row.items as Array<Record<string, unknown>>) : [];
  const first = items[0] ?? {};
  const grade = (first.grade ?? first.product ?? {}) as Record<string, unknown>;
  const quantity = items.reduce((sum, item) => sum + num(item.quantity ?? item.requestedQty), 0);
  const cost = num(row.targetPrice);
  const createdAt = iso(row.createdAt ?? row.submittedAt);
  const customerName = String(customer.legalName ?? customer.name ?? "Customer");
  const sellerName = seller.legalName || seller.name ? String(seller.legalName ?? seller.name) : undefined;
  return {
    id: String(row.id),
    poNumber: String(row.referenceNumber ?? ""),
    customerId: String(row.customerOrgId ?? customer.id ?? ""),
    customerName,
    sellerId: seller.id ? String(seller.id) : undefined,
    sellerName,
    commodity: String(grade.code ?? grade.name ?? first.productName ?? "Material"),
    grade: String(grade.code ?? grade.name ?? "—"),
    quantity,
    unit: "MT",
    estimatedCost: cost,
    status: mapProcurementStatus(String(row.status ?? "")),
    deliveryLocation: String(row.deliveryLocation ?? row.destinationRegion ?? "—"),
    requestedDate: createdAt,
    requiredDeliveryDate: iso(row.requiredByDate ?? row.createdAt),
    paymentTerms: String(row.paymentMethod ?? "—"),
    creditTerms: "PetroTrade managed",
    createdAt,
    updatedAt: iso(row.updatedAt ?? row.createdAt),
    timeline: [],
    quotations: [],
    remarks: String(row.notes ?? ""),
    source: "Customer Web",
    supplier: sellerName ?? "Unassigned",
    estCost: cost,
    buyer: customerName,
  };
}

export async function listAdminKyc() {
  const [sellers, customers] = await Promise.all([
    listAll<Record<string, unknown>>("/admin/compliance"),
    listAdminCustomers(),
  ]);
  const sellerKyc = sellers.map((row) => mapAdminKyc(row, "Seller"));
  const customerKyc = customers.map((customer) => ({
    id: `kyc-${customer.id}`,
    entity: customer.company,
    entityType: "Customer" as const,
    type: "Company" as const,
    submitted: customer.lastActive,
    documents: 0,
    risk: customer.kycStatus === "Rejected" ? ("High" as const) : ("Medium" as const),
    status: customer.kycStatus,
    reviewer: "Admin",
    gst: customer.gst,
    pan: customer.pan,
    bank: "",
    notes: "",
    source: customer.source,
  }));
  return [...sellerKyc, ...customerKyc];
}

export async function listAdminDocuments() {
  const rows = await listAll<Record<string, unknown>>("/admin/documents");
  return rows.map(mapAdminDocument);
}

export async function listAdminProcurements() {
  const rows = await listAll<Record<string, unknown>>("/admin/purchase-requests");
  return rows.map(mapAdminProcurement);
}

export async function cancelAdminProcurement(id: string, reason: string) {
  await apiRequest(`/admin/purchase-requests/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function suspendAdminCustomer(id: string, reason = "Suspended by admin") {
  await apiRequest(`/admin/customers/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function suspendAdminSeller(id: string, reason = "Suspended by admin") {
  await apiRequest(`/admin/sellers/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function getAdminReportsOverview() {
  const { data } = await apiRequest<{
    users: number;
    customers: number;
    sellers: number;
    purchaseRequests: number;
    purchaseOrders: number;
    payments: number;
    offers: number;
    shipments: number;
  }>("/admin/reports/overview");
  return data;
}

export async function getAdminSalesReport() {
  const { data } = await apiRequest<{
    count: number;
    totalAmount: string;
    byStatus: Array<{ status: string; count: number; totalAmount: string }>;
  }>("/admin/reports/sales");
  return data;
}
