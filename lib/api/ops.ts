import { apiRequest } from "@/lib/api/client";
import type {
  AdminKycAuditEvent,
  AdminKycDetail,
  AdminKycDocumentHistory,
  AdminKycVerification,
  AdminKycVerificationStatus,
  AdminSellerReview,
  AppSource,
  Customer,
  KycChangeRequest,
  KycRecord,
  KycStatus,
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
    kycStatus: mapKycStatus(String(org.verificationStatus ?? "")),
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
    kycStatus: mapKycStatus(String(org.verificationStatus ?? "")),
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
  const warehouse = (row.warehouse ?? {}) as Record<string, unknown>;
  const count = (row._count ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    offerNumber: row.referenceNumber ? String(row.referenceNumber) : undefined,
    sellerId: String(row.organizationId ?? org.id ?? ""),
    seller: String(org.legalName ?? org.name ?? "Seller"),
    grade: String(
      product.name ?? grade.displayName ?? grade.code ?? grade.name ?? "Grade",
    ),
    price: num(row.basePrice),
    bulkPrice: num(row.basePrice),
    quantity: num(row.quantity),
    validity: iso(row.validUntil ?? row.createdAt),
    location: String(
      warehouse.name ??
        warehouse.city ??
        row.deliveryTerms ??
        "Assigned hub",
    ),
    remarks: String(
      count.purchaseRequestItems != null
        ? `PRs: ${count.purchaseRequestItems}`
        : (row.notes ?? ""),
    ),
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

export async function fetchAdminOfferSummary() {
  const { data } = await apiRequest<Record<string, number>>("/admin/offers/summary");
  return data ?? {};
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

const ADMIN_KYC_STATUS: Record<string, KycStatus> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  CHANGES_REQUESTED: "Changes Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

function mapUploadSource(value: unknown): AppSource | null {
  switch (value) {
    case "SELLER_APP":
      return "Seller App";
    case "SELLER_WEB":
      return "Seller Web";
    case "CUSTOMER_APP":
      return "Customer App";
    case "CUSTOMER_WEB":
      return "Customer Web";
    default:
      return null;
  }
}

function mapChangeRequest(value: unknown): KycChangeRequest | null {
  const raw = asRecord(value);
  if (typeof raw.reason !== "string") return null;
  return {
    reason: raw.reason,
    slots: Array.isArray(raw.slots) ? raw.slots.map(String) : [],
    documentIds: Array.isArray(raw.documentIds) ? raw.documentIds.map(String) : [],
    requestedAt: iso(raw.requestedAt),
  };
}

/** Row from GET /admin/kyc (seller onboarding + customer KYC queue). */
export function mapAdminKycRow(row: Record<string, unknown>): KycRecord {
  const org = asRecord(row.organization);
  const contact = asRecord(row.contact);
  const docs = asRecord(row.documents);
  const bank = asRecord(row.bank);
  const entityType = row.entityType === "CUSTOMER" ? "Customer" : "Seller";
  const kycStatus = ADMIN_KYC_STATUS[String(row.kycStatus ?? "")] ?? "Pending";
  const missing = Array.isArray(docs.missing) ? docs.missing.map(String) : [];
  const bankLabel = bank.accountLast4
    ? [optionalString(bank.bankName), `A/c •••• ${String(bank.accountLast4)}`, optionalString(bank.ifsc)]
        .filter(Boolean)
        .join(" · ")
    : "";
  return {
    id: String(row.id),
    entityId: String(row.entityId),
    entity: String(org.legalName || org.name || entityType),
    entityType,
    type: "Company",
    submitted: iso(row.submittedAt ?? row.lastActivityAt ?? row.createdAt),
    documents: num(docs.uploaded),
    documentsPending: num(docs.pending),
    documentsRejected: num(docs.rejected),
    documentsMissing: missing,
    risk:
      kycStatus === "Rejected"
        ? "High"
        : missing.length || num(docs.rejected)
          ? "Medium"
          : "Low",
    status: kycStatus,
    reviewer: row.reviewedAt ? "Compliance" : "—",
    reviewedAt: optionalString(row.reviewedAt),
    gst: String(org.gstin ?? ""),
    pan: maskIdentifier(optionalString(org.pan)),
    bank: bankLabel,
    notes: String(row.reviewNotes ?? ""),
    rejectedReason: optionalString(row.rejectedReason),
    changeRequest: mapChangeRequest(row.changeRequest),
    contact: String(contact.name ?? ""),
    phone: String(contact.phone ?? ""),
    email: String(contact.email ?? ""),
    entityStatus: String(row.entityStatus ?? ""),
    source:
      mapUploadSource(row.source) ??
      (entityType === "Seller" ? "Seller Web" : "Customer Web"),
  };
}

function kycPath(record: Pick<KycRecord, "entityType" | "entityId">) {
  const type = record.entityType === "Customer" ? "customer" : "seller";
  return `/admin/kyc/${type}/${record.entityId}`;
}

const VERIFICATION_STATUS: Record<string, AdminKycVerificationStatus> = {
  VERIFYING: "Verifying",
  VERIFIED: "Verified",
  FAILED: "Failed",
  MANUAL_REVIEW: "Manual Review",
};

function mapVerification(value: unknown): AdminKycVerification | null {
  const raw = asRecord(value);
  if (!raw.id) return null;
  const details: Record<string, string> = {};
  for (const [key, detail] of Object.entries(asRecord(raw.details))) {
    if (typeof detail === "string" && detail.trim()) details[key] = detail;
  }
  return {
    id: String(raw.id),
    type: raw.type === "GST" ? "GST" : "PAN",
    status: VERIFICATION_STATUS[String(raw.status)] ?? "Verifying",
    method: raw.method === "PROVIDER" ? "Provider" : raw.method === "MANUAL" ? "Manual" : null,
    identifierMasked: String(raw.identifierMasked ?? ""),
    provider: String(raw.provider ?? ""),
    details,
    failureCode: optionalString(raw.failureCode),
    message: String(raw.message ?? ""),
    verifiedAt: optionalString(raw.verifiedAt),
    reviewedAt: optionalString(raw.reviewedAt),
    createdAt: iso(raw.createdAt),
  };
}

function mapDocumentHistory(value: unknown): AdminKycDocumentHistory[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const group = asRecord(entry);
    const versions = Array.isArray(group.versions) ? group.versions : [];
    return {
      slot: String(group.slot ?? ""),
      name: String(group.name ?? group.slot ?? "Document"),
      versions: versions.map((item) => {
        const version = asRecord(item);
        const size = Number(version.fileSizeBytes);
        return {
          id: String(version.id),
          version: num(version.version) || 1,
          status: String(version.status ?? ""),
          fileName: String(version.fileName ?? "Document"),
          mimeType: optionalString(version.mimeType),
          fileSizeBytes: Number.isFinite(size) && size > 0 ? size : null,
          rejectionReason: optionalString(version.rejectionReason),
          source: mapUploadSource(version.uploadSource),
          uploadedAt: iso(version.uploadedAt),
          current: Boolean(version.current),
        };
      }),
    };
  });
}

/** Shows the first two and last three characters, e.g. AB•••••34F. */
export function maskIdentifier(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (raw.length <= 5) return "•".repeat(raw.length);
  const head = raw.length > 10 ? 4 : 2;
  const tail = raw.length > 10 ? 4 : 3;
  return `${raw.slice(0, head)}${"•".repeat(raw.length - head - tail)}${raw.slice(-tail)}`;
}

export async function getAdminKycDetail(
  record: Pick<KycRecord, "entityType" | "entityId">,
): Promise<AdminKycDetail> {
  const { data } = await apiRequest<Record<string, unknown>>(kycPath(record));
  const details = asRecord(data.details);
  const slots = Array.isArray(data.slots) ? (data.slots as Record<string, unknown>[]) : [];
  const business = data.business ? asRecord(data.business) : null;
  const verifications = data.verifications ? asRecord(data.verifications) : null;
  return {
    record: mapAdminKycRow(data),
    blockers: Array.isArray(data.blockers) ? data.blockers.map(String) : [],
    warnings: Array.isArray(data.warnings) ? data.warnings.map(String) : [],
    legalName: optionalString(details.legalName),
    address: optionalString(details.address),
    business: business
      ? {
          name: optionalString(business.name),
          legalName: optionalString(business.legalName),
          tradeName: optionalString(business.tradeName),
          businessType: optionalString(business.businessType),
          constitution: optionalString(business.constitution),
          address: optionalString(business.address),
          state: optionalString(business.state),
          pincode: optionalString(business.pincode),
        }
      : null,
    verifications: verifications
      ? {
          pan: mapVerification(verifications.pan),
          gst: mapVerification(verifications.gst),
          history: Array.isArray(verifications.history)
            ? verifications.history.flatMap((row) => mapVerification(row) ?? [])
            : [],
        }
      : null,
    documentHistory: mapDocumentHistory(data.documentHistory),
    slots: slots.map((slot) => {
      const doc = asRecord(slot.document);
      const size = Number(doc.fileSizeBytes);
      return {
        slot: String(slot.slot),
        name: String(slot.name ?? slot.slot),
        description: String(slot.description ?? ""),
        required: Boolean(slot.required),
        document: doc.id
          ? {
              id: String(doc.id),
              slot: optionalString(doc.slot),
              slotLabel: String(doc.slotLabel ?? slot.name ?? "Document"),
              fileName: String(doc.fileName ?? "Document"),
              mimeType: optionalString(doc.mimeType),
              fileSizeBytes: Number.isFinite(size) && size > 0 ? size : null,
              status: mapDocumentStatus(String(doc.status ?? "")),
              rejectionReason: optionalString(doc.rejectionReason),
              source: mapUploadSource(doc.uploadSource),
              uploadedAt: iso(doc.uploadedAt),
              reviewedAt: optionalString(doc.reviewedAt),
            }
          : null,
      };
    }),
  };
}

export async function approveAdminKyc(
  record: Pick<KycRecord, "entityType" | "entityId">,
  notes?: string,
) {
  await apiRequest(`${kycPath(record)}/approve`, {
    method: "POST",
    body: JSON.stringify(notes?.trim() ? { notes: notes.trim() } : {}),
  });
}

export async function rejectAdminKyc(
  record: Pick<KycRecord, "entityType" | "entityId">,
  reason: string,
) {
  await apiRequest(`${kycPath(record)}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function getAdminKycAudit(
  record: Pick<KycRecord, "entityType" | "entityId">,
): Promise<AdminKycAuditEvent[]> {
  const { data } = await apiRequest<Record<string, unknown>[]>(`${kycPath(record)}/audit`);
  return (data ?? []).map((row) => {
    const actor = asRecord(row.actor);
    const details: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(asRecord(row.details))) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        details[key] = value;
      }
    }
    return {
      id: String(row.id),
      action: String(row.action ?? ""),
      actor: {
        id: optionalString(actor.id),
        name: optionalString(actor.name),
        role: String(actor.role ?? "ADMIN"),
      },
      details,
      createdAt: iso(row.createdAt),
    };
  });
}

/** Short-lived signed URL for any KYC file version, including replaced ones. */
export async function downloadAdminKycVersion(
  record: Pick<KycRecord, "entityType" | "entityId">,
  documentId: string,
  disposition: "inline" | "attachment" = "attachment",
) {
  const { data } = await apiRequest<{ url: string; fileName?: string; mimeType?: string | null }>(
    `${kycPath(record)}/documents/${documentId}/download?disposition=${disposition}`,
  );
  return data;
}

export async function requestAdminKycChanges(
  record: Pick<KycRecord, "entityType" | "entityId">,
  reason: string,
  documentIds: string[],
) {
  await apiRequest(`${kycPath(record)}/request-changes`, {
    method: "POST",
    body: JSON.stringify({ reason, documentIds }),
  });
}

function mapDocumentCategory(category?: string): PlatformDocument["category"] {
  const key = (category ?? "").toUpperCase();
  if (key.includes("GST")) return "GST";
  if (key.includes("PAN")) return "PAN";
  if (key.includes("AADHAAR") || key.includes("KYC")) return "KYC";
  if (key.includes("BANK")) return "Bank";
  if (key.includes("PO") || key.includes("PURCHASE")) return "Purchase Orders";
  if (key.includes("INVOICE")) return "Invoices";
  if (key.includes("EWAY") || key.includes("E-WAY")) return "E-way Bills";
  if (key.includes("DELIV") || key.includes("POD")) return "Delivery Documents";
  return "Compliance";
}

function mapDocumentStatus(status?: string): PlatformDocument["status"] {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    case "REVISION_REQUESTED":
      return "Revision Requested";
    case "UNDER_REVIEW":
    case "UPLOADED":
    case "REPLACED":
    default:
      return "Pending";
  }
}

const ONBOARDING_SLOT_LABELS: Record<string, string> = {
  gst: "GST Certificate",
  pan: "PAN Card",
  aadhaar: "Aadhaar",
  cancelledCheque: "Cancelled Cheque",
};

export function onboardingSlotLabel(slot?: string | null) {
  return slot ? ONBOARDING_SLOT_LABELS[slot] : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function mapDocumentSource(
  ownerType: string,
  purpose: string,
  uploadSource: string,
): PlatformDocument["source"] {
  if (uploadSource === "SELLER_APP") return "Seller App";
  if (uploadSource === "SELLER_WEB") return "Seller Web";
  if (uploadSource === "CUSTOMER_APP") return "Customer App";
  if (uploadSource === "CUSTOMER_WEB") return "Customer Web";
  if (ownerType === "SELLER" || purpose.startsWith("SELLER_")) return "Seller Web";
  if (ownerType === "CUSTOMER") return "Customer Web";
  return "Admin Portal";
}

export function mapAdminDocument(row: Record<string, unknown>): PlatformDocument {
  const org = asRecord(row.organization);
  const meta = asRecord(row.metadata);
  const uploader = asRecord(row.uploadedBy);
  const seller = asRecord(row.seller);
  const slot = optionalString(row.slot) ?? optionalString(meta.slot);
  const purpose = optionalString(row.purpose) ?? optionalString(meta.purpose) ?? "";
  const uploadSource =
    optionalString(row.uploadSource) ?? optionalString(meta.uploadSource) ?? "";
  const slotLabel = optionalString(row.slotLabel) ?? onboardingSlotLabel(slot);
  const fileName = String(
    row.originalFileName ?? row.fileName ?? row.documentNumber ?? "Document",
  );
  const ownerType = String(row.ownerType ?? "").toUpperCase();
  const size = Number(row.fileSizeBytes);
  const uploaderName =
    [uploader.firstName, uploader.lastName].filter(Boolean).join(" ") ||
    String(uploader.email ?? uploader.phone ?? "");

  return {
    id: String(row.id),
    name: slotLabel ? `${slotLabel} (${fileName})` : fileName,
    category: mapDocumentCategory(String(row.category ?? "")),
    entity: String(org.legalName || org.name || "Organization"),
    uploadedAt: iso(row.uploadedAt ?? row.createdAt),
    status: mapDocumentStatus(String(row.status ?? "")),
    source: mapDocumentSource(ownerType, purpose, uploadSource),
    fileName,
    documentNumber: optionalString(row.documentNumber),
    mimeType: optionalString(row.mimeType),
    fileSizeBytes: Number.isFinite(size) && size > 0 ? size : null,
    slot,
    isOnboarding: purpose === "SELLER_ONBOARDING" || purpose === "CUSTOMER_KYC",
    rejectionReason: optionalString(row.rejectionReason),
    verificationNotes: optionalString(row.verificationNotes),
    reviewedAt: optionalString(row.approvedAt) ?? optionalString(row.rejectedAt),
    uploadedBy: uploader.id
      ? {
          name: uploaderName,
          email: String(uploader.email ?? ""),
          phone: String(uploader.phone ?? ""),
        }
      : null,
    seller: seller.id
      ? {
          id: String(seller.id),
          status: String(seller.status ?? ""),
          onboardingStatus: optionalString(seller.onboardingStatus),
          onboardingSubmittedAt: optionalString(seller.onboardingSubmittedAt),
        }
      : null,
    organization: org.id
      ? { gstin: String(org.gstin ?? ""), pan: String(org.pan ?? "") }
      : null,
  };
}

export async function listAdminDocuments() {
  const rows = await listAll<Record<string, unknown>>("/admin/documents");
  return rows.map(mapAdminDocument);
}

export async function getAdminSellerReview(id: string): Promise<AdminSellerReview> {
  const { data } = await apiRequest<Record<string, unknown>>(`/admin/sellers/${id}`);
  const org = asRecord(data.organization);
  const user = asRecord(data.user);
  const onboarding = asRecord(data.onboarding);
  const docs = Array.isArray(data.onboardingDocuments)
    ? (data.onboardingDocuments as Record<string, unknown>[])
    : [];
  return {
    id: String(data.id),
    company: String(org.legalName || org.name || "Seller"),
    status: String(data.status ?? ""),
    onboardingStatus: optionalString(onboarding.status),
    submittedAt: optionalString(onboarding.submittedAt),
    gstin: String(org.gstin ?? ""),
    pan: String(org.pan ?? ""),
    contact:
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      String(user.displayName ?? ""),
    email: String(user.email ?? ""),
    phone: String(user.phone ?? ""),
    documents: docs.map((doc) => ({
      id: String(doc.id),
      slot: optionalString(doc.slot),
      category: String(doc.category ?? ""),
      fileName: String(doc.originalFileName ?? doc.fileName ?? "Document"),
      mimeType: optionalString(doc.mimeType),
      status: mapDocumentStatus(String(doc.status ?? "")),
      rejectionReason: optionalString(doc.rejectionReason),
      uploadedAt: iso(doc.createdAt),
    })),
  };
}

export async function approveAdminSeller(id: string, notes?: string) {
  await apiRequest(`/admin/sellers/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes: notes?.trim() || "Approved after document review" }),
  });
}

export async function rejectAdminSeller(id: string, reason: string) {
  await apiRequest(`/admin/sellers/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function approveAdminDocument(id: string, notes?: string) {
  await apiRequest(`/admin/documents/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes: notes ?? "Verified by compliance admin" }),
  });
}

export async function rejectAdminDocument(id: string, reason: string) {
  await apiRequest(`/admin/documents/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function downloadAdminDocument(
  id: string,
  disposition: "inline" | "attachment" = "attachment",
) {
  const { data } = await apiRequest<{
    url: string;
    fileName?: string;
    mimeType?: string | null;
    expiresAt?: string;
  }>(`/admin/documents/${id}/download?disposition=${disposition}`);
  return data;
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
  const rows = await listAll<Record<string, unknown>>("/admin/kyc");
  return rows.map(mapAdminKycRow);
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

function mapSupportStatus(status?: string): import("@/types").SupportTicket["status"] {
  switch (status) {
    case "IN_PROGRESS":
      return "In Progress";
    case "WAITING_CUSTOMER":
      return "Waiting";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
    default:
      return "Open";
  }
}

function mapSupportPriority(priority?: string): import("@/types").SupportTicket["priority"] {
  switch (priority) {
    case "LOW":
      return "Low";
    case "HIGH":
      return "High";
    case "CRITICAL":
      return "Critical";
    default:
      return "Medium";
  }
}

const SUPPORT_STATUS_CODES: import("@/types").SupportTicketStatusCode[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

function toSupportStatusCode(value: unknown): import("@/types").SupportTicketStatusCode {
  const code = String(value ?? "OPEN") as import("@/types").SupportTicketStatusCode;
  return SUPPORT_STATUS_CODES.includes(code) ? code : "OPEN";
}

const SUPPORT_SOURCES: import("@/types").AppSource[] = [
  "Customer App",
  "Customer Web",
  "Seller App",
  "Seller Web",
];

function mapSupportTicket(row: Record<string, unknown>): import("@/types").SupportTicket {
  const requesterType = String(row.requesterType ?? "CUSTOMER") === "SELLER" ? "Seller" : "Customer";
  const backendSource = String(row.source ?? "") as import("@/types").AppSource;
  const source: import("@/types").AppSource = SUPPORT_SOURCES.includes(backendSource)
    ? backendSource
    : (`${requesterType} ${row.channel === "APP" ? "App" : "Web"}` as import("@/types").AppSource);
  const statusCode = toSupportStatusCode(row.status);
  const messages = Array.isArray(row.messages) ? row.messages : [];
  const optional = (value: unknown) => (value == null || value === "" ? null : String(value));
  return {
    id: String(row.id),
    ticketNumber: String(row.ticketNumber ?? row.ticketId ?? row.id),
    requesterType,
    requesterName: String(row.requesterName ?? "—"),
    requesterEmail: optional(row.requesterEmail),
    requesterPhone: optional(row.requesterPhone),
    organizationName: String(row.organizationName ?? "—"),
    category: String(row.categoryLabel ?? row.category ?? "Other"),
    subject: String(row.subject ?? ""),
    description: String(row.description ?? ""),
    relatedOrderId: optional(row.relatedOrderId),
    attachmentName: optional(row.attachmentName),
    priority: mapSupportPriority(String(row.priority ?? "MEDIUM")),
    status: mapSupportStatus(statusCode),
    statusCode,
    allowedTransitions: Array.isArray(row.allowedTransitions)
      ? row.allowedTransitions.map(toSupportStatusCode)
      : [],
    awaitingSupport:
      row.lastMessageSender === "REQUESTER" && statusCode !== "RESOLVED" && statusCode !== "CLOSED",
    resolutionNote: optional(row.resolutionNote),
    resolvedAt: row.resolvedAt ? iso(row.resolvedAt) : null,
    closedAt: row.closedAt ? iso(row.closedAt) : null,
    assignedTo: String(row.assignedToName ?? "Unassigned"),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    source,
    messages: messages.map((m) => {
      const msg = m as Record<string, unknown>;
      const sender = String(msg.sender ?? "SYSTEM");
      return {
        id: String(msg.id),
        sender: sender === "REQUESTER" || sender === "AGENT" ? sender : "SYSTEM",
        senderName: String(msg.senderName ?? ""),
        body: String(msg.body ?? ""),
        attachmentName: optional(msg.attachmentName),
        createdAt: iso(msg.createdAt),
      };
    }),
  };
}

export async function listAdminSupportTickets() {
  const rows = await listAll<Record<string, unknown>>("/admin/support/tickets");
  return rows.map(mapSupportTicket);
}

export async function updateAdminSupportTicketStatus(
  id: string,
  status: import("@/types").SupportTicketStatusCode,
  note?: string,
) {
  const { data } = await apiRequest<Record<string, unknown>>(
    `/admin/support/tickets/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, ...(note?.trim() ? { note: note.trim() } : {}) }),
    },
  );
  return mapSupportTicket(data as Record<string, unknown>);
}

export async function replyAdminSupportTicket(id: string, body: string) {
  const { data } = await apiRequest<Record<string, unknown>>(
    `/admin/support/tickets/${id}/reply`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    },
  );
  return mapSupportTicket(data as Record<string, unknown>);
}
