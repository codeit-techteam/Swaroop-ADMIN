export type AppSource =
  | "Customer App"
  | "Customer Web"
  | "Seller App"
  | "Seller Web"
  | "Admin Portal";

export type AdminRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "OPERATIONS"
  | "PROCUREMENT"
  | "FINANCE"
  | "COMPLIANCE"
  | "SUPPORT";

export type EntityStatus = "Active" | "Inactive" | "Suspended";
export type KycStatus =
  | "Pending"
  | "Under Review"
  | "Changes Requested"
  | "Approved"
  | "Rejected"
  | "Expired";
export type RiskLevel = "Low" | "Medium" | "High";
export type PlatformStatus = "Operational" | "Degraded" | "Outage";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  department: string;
  lastLogin: string;
  permissions: string[];
}

export interface Customer {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  location: string;
  kycStatus: KycStatus;
  creditLimit: number;
  usedCredit: number;
  orders: number;
  spend: number;
  status: EntityStatus;
  lastActive: string;
  source: Extract<AppSource, "Customer App" | "Customer Web">;
  gst: string;
  pan: string;
  addresses: string[];
}

export interface Seller {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  location: string;
  kycStatus: KycStatus;
  products: number;
  offers: number;
  orders: number;
  revenue: number;
  performance: number;
  status: EntityStatus;
  lastActive: string;
  source: Extract<AppSource, "Seller App" | "Seller Web">;
  gst: string;
  pan: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: string;
  source: AppSource;
  status: EntityStatus;
  lastActive: string;
  createdAt: string;
}

/** Catalog inventory snapshot. Canonical tradable identity lives in Grade Master — see `types/grade.ts`. */
export interface ProductGrade {
  id: string;
  grade: string;
  commodity: string;
  manufacturer: string;
  brand: string;
  specification: string;
  location: string;
  availableQty: number;
  activeSellers: number;
  activeOffers: number;
  inventory: number;
  status: EntityStatus;
}

export interface Offer {
  id: string;
  offerNumber?: string;
  sellerId: string;
  seller: string;
  grade: string;
  price: number;
  bulkPrice: number;
  quantity: number;
  validity: string;
  location: string;
  remarks: string;
  status: "Draft" | "Pending Review" | "Active" | "Paused" | "Expired" | "Rejected";
  source: Extract<AppSource, "Seller App" | "Seller Web">;
  updatedAt: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyer: string;
  sellerId: string;
  seller: string;
  grade: string;
  quantity: number;
  value: number;
  payment: "Pending" | "Processing" | "Verified" | "Failed" | "Refunded";
  dispatch: string;
  shipment: string;
  status:
    | "Pending"
    | "Confirmed"
    | "Processing"
    | "Ready for Dispatch"
    | "Dispatched"
    | "In Transit"
    | "Delivered"
    | "Cancelled"
    | "Disputed";
  source: Extract<AppSource, "Customer App" | "Customer Web">;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customer: string;
  seller: string;
  amount: number;
  method: "NEFT" | "RTGS" | "UPI" | "LC" | "Credit";
  transaction: string;
  date: string;
  status: "Pending" | "Processing" | "Verified" | "Failed" | "Refunded";
  source: AppSource;
}

export interface CreditAccount {
  id: string;
  customerId: string;
  customer: string;
  approved: number;
  used: number;
  available: number;
  risk: RiskLevel;
  overdue: number;
}

export interface Receivable {
  id: string;
  customer: string;
  invoice: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  outstanding: number;
  daysOverdue: number;
  risk: RiskLevel;
  status: "Current" | "Due" | "Overdue" | "Collected";
}

export interface Shipment {
  id: string;
  orderId: string;
  seller: string;
  customer: string;
  grade: string;
  quantity: number;
  vehicle: string;
  route: string;
  eta: string;
  status: "Scheduled" | "Loading" | "Dispatched" | "In Transit" | "Delivered" | "Delayed";
  milestone: string;
  source: Extract<AppSource, "Seller App" | "Seller Web" | "Admin Portal">;
}

export interface Dispute {
  id: string;
  orderId: string;
  customer: string;
  seller: string;
  category: "Quality" | "Quantity" | "Price" | "Delivery" | "Payment" | "Documentation" | "Other";
  amount: number;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "Investigating" | "Awaiting Info" | "Resolved" | "Rejected";
  createdAt: string;
  assignedTo: string;
}

export type SupportTicketStatusCode =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_CUSTOMER"
  | "RESOLVED"
  | "CLOSED";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  requesterType: "Customer" | "Seller";
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  organizationName: string;
  category: string;
  subject: string;
  description: string;
  relatedOrderId: string | null;
  attachmentName: string | null;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Waiting" | "Resolved" | "Closed";
  statusCode: SupportTicketStatusCode;
  allowedTransitions: SupportTicketStatusCode[];
  /** Last message came from the requester and the ticket is still active. */
  awaitingSupport: boolean;
  resolutionNote: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  source: AppSource;
  messages: Array<{
    id: string;
    sender: "REQUESTER" | "AGENT" | "SYSTEM";
    senderName: string;
    body: string;
    attachmentName: string | null;
    createdAt: string;
  }>;
}

export interface KycRecord {
  id: string;
  entity: string;
  entityType: "Customer" | "Seller";
  type: "Company" | "GST" | "PAN" | "Bank";
  submitted: string;
  documents: number;
  risk: RiskLevel;
  status: KycStatus;
  reviewer: string;
  gst: string;
  pan: string;
  bank: string;
  notes: string;
  source: AppSource;
  /** Present on records loaded from GET /admin/kyc. */
  entityId?: string;
  contact?: string;
  phone?: string;
  email?: string;
  entityStatus?: string;
  documentsPending?: number;
  documentsRejected?: number;
  documentsMissing?: string[];
  reviewedAt?: string | null;
  rejectedReason?: string | null;
  changeRequest?: KycChangeRequest | null;
  /** Latest backend PAN / GSTIN verification for this entity. */
  panVerification?: AdminKycVerificationStatus | "Not Started";
  gstVerification?: AdminKycVerificationStatus | "Not Started";
  /** GSTIN is registered to a different PAN than the verified one. */
  panGstMismatch?: boolean;
}

export interface AdminKycVerificationCounts {
  verified: number;
  failed: number;
  manualReview: number;
  notStarted: number;
}

/** GET /admin/kyc/metrics — aggregates computed from the database. */
export interface AdminKycMetrics {
  totals: { customers: number; sellers: number };
  status: Record<string, number>;
  customers: Record<string, number>;
  sellers: Record<string, number>;
  pan: AdminKycVerificationCounts;
  gst: AdminKycVerificationCounts;
  mismatches: number;
  documentsPending: number;
  documentsMissing: number;
  generatedAt: string;
}

export interface KycChangeRequest {
  reason: string;
  slots: string[];
  documentIds: string[];
  requestedAt: string;
}

export interface AdminKycDocument {
  id: string;
  slot: string | null;
  slotLabel: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  status: PlatformDocument["status"];
  rejectionReason: string | null;
  source: AppSource | null;
  uploadedAt: string;
  reviewedAt: string | null;
}

export interface AdminKycSlot {
  slot: string;
  name: string;
  description: string;
  required: boolean;
  document: AdminKycDocument | null;
}

export type AdminKycVerificationStatus = "Verifying" | "Verified" | "Failed" | "Manual Review";

export interface AdminKycVerification {
  id: string;
  type: "PAN" | "GST";
  status: AdminKycVerificationStatus;
  method: "Provider" | "Manual" | null;
  identifierMasked: string;
  provider: string;
  /** Provider request reference, for support escalations with the provider. */
  providerReference: string | null;
  /** App that initiated the check, e.g. "Seller Web". */
  source: string | null;
  details: Record<string, string>;
  failureCode: string | null;
  message: string;
  verifiedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminKycDocumentVersion {
  id: string;
  version: number;
  status: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  rejectionReason: string | null;
  source: AppSource | null;
  uploadedAt: string;
  current: boolean;
}

export interface AdminKycDocumentHistory {
  slot: string;
  name: string;
  versions: AdminKycDocumentVersion[];
}

export interface AdminKycBusiness {
  name: string | null;
  legalName: string | null;
  tradeName: string | null;
  businessType: string | null;
  constitution: string | null;
  address: string | null;
  state: string | null;
  pincode: string | null;
}

export interface AdminKycAuditEvent {
  id: string;
  action: string;
  actor: { id: string | null; name: string | null; role: string };
  details: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface AdminKycDetail {
  record: KycRecord;
  slots: AdminKycSlot[];
  blockers: string[];
  /** Non-blocking notes the reviewer should acknowledge before approving. */
  warnings: string[];
  legalName: string | null;
  address: string | null;
  business: AdminKycBusiness | null;
  verifications: {
    pan: AdminKycVerification | null;
    gst: AdminKycVerification | null;
    history: AdminKycVerification[];
    /** GSTIN is registered to a different PAN than the verified PAN. */
    mismatch: boolean;
  } | null;
  documentHistory: AdminKycDocumentHistory[];
}

export type ProcurementStatus =
  | "Draft"
  | "Submitted"
  | "Under Review"
  | "Negotiation"
  | "Urgent Review"
  | "Pending Inv."
  | "Pending Approval"
  | "Approved"
  | "Rejected"
  | "PO Created"
  | "Seller Confirmed"
  | "Processing"
  | "Dispatched"
  | "Completed"
  | "Cancelled";

export type QuotationStatus = "Quoted" | "Negotiation" | "Selected" | "Rejected";
export type NegotiationState = "Open" | "Countered" | "Accepted" | "Rejected";
export type ShipmentMilestone = "Dispatched" | "In Transit" | "Delivered";

export interface ProcurementTimelineEvent {
  id: string;
  title: string;
  description: string;
  status: string;
  actor: string;
  timestamp: string;
}

export interface SupplierQuotation {
  id: string;
  sellerId?: string;
  supplier: string;
  grade: string;
  quantity: number;
  unit: string;
  pricePerMt: number;
  total: number;
  paymentTerms: string;
  deliveryDays: number;
  status: QuotationStatus;
  selected?: boolean;
}

export interface ProcurementNegotiation {
  initialPrice: number;
  latestPrice: number;
  adminTargetPrice: number;
  quantity: number;
  status: NegotiationState;
  remarks?: string;
}

export interface ProcurementApprovalInfo {
  requestedBy: string;
  department: string;
  budget: number;
  creditExposure: number;
  negotiatedPrice: number;
}

export interface ProcurementDispatchInfo {
  vehicle: string;
  driver: string;
  loadingLocation: string;
  destination: string;
  dispatchDate: string;
  expectedArrival: string;
}

export interface ProcurementShipmentInfo {
  shipmentId: string;
  vehicle: string;
  route: string;
  dispatchDate: string;
  eta: string;
  status: ShipmentMilestone;
}

export interface Procurement {
  id: string;
  poNumber?: string;
  customerId: string;
  customerName: string;
  sellerId?: string;
  sellerName?: string;
  commodity: string;
  grade: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  negotiatedPrice?: number;
  status: ProcurementStatus;
  deliveryLocation: string;
  requestedDate: string;
  requiredDeliveryDate: string;
  paymentTerms: string;
  creditTerms: string;
  createdAt: string;
  updatedAt: string;
  timeline: ProcurementTimelineEvent[];
  quotations: SupplierQuotation[];
  negotiation?: ProcurementNegotiation;
  approval?: ProcurementApprovalInfo;
  dispatch?: ProcurementDispatchInfo;
  shipment?: ProcurementShipmentInfo;
  remarks?: string;
  source: Extract<AppSource, "Customer App" | "Customer Web" | "Admin Portal">;
  /** Screenshot / legacy table field — mirrors sellerName */
  supplier: string;
  /** Screenshot / legacy table field — mirrors estimatedCost */
  estCost: number;
  /** Screenshot / legacy table field — mirrors customerName */
  buyer: string;
}

/** @deprecated Use Procurement. Kept as an alias for existing Admin modules. */
export type ProcurementItem = Procurement;

export interface ProcurementActivity {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
  referenceId: string;
}

export interface PurchaseRequest {
  id: string;
  customer: string;
  grade: string;
  quantity: number;
  targetPrice: number;
  status: "Open" | "Matched" | "Negotiating" | "Closed";
  source: Extract<AppSource, "Customer App" | "Customer Web">;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: "KYC" | "Order" | "Payment" | "Dispatch" | "Dispute" | "Seller" | "Customer" | "System" | "Procurement" | "Content";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href: string;
  source: AppSource;
}

export interface PlatformDocument {
  id: string;
  name: string;
  category:
    | "KYC"
    | "GST"
    | "PAN"
    | "Bank"
    | "Purchase Orders"
    | "Invoices"
    | "E-way Bills"
    | "Delivery Documents"
    | "Compliance";
  entity: string;
  uploadedAt: string;
  status: "Pending" | "Verified" | "Rejected" | "Revision Requested";
  source: AppSource;
  fileName?: string;
  documentNumber?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  /** Seller onboarding slot (gst, pan, aadhaar, cancelledCheque). */
  slot?: string | null;
  isOnboarding?: boolean;
  rejectionReason?: string | null;
  verificationNotes?: string | null;
  reviewedAt?: string | null;
  uploadedBy?: { name: string; email: string; phone: string } | null;
  seller?: {
    id: string;
    status: string;
    onboardingStatus: string | null;
    onboardingSubmittedAt: string | null;
  } | null;
  organization?: { gstin: string; pan: string } | null;
}

export interface AdminSellerOnboardingDocument {
  id: string;
  slot: string | null;
  category: string;
  fileName: string;
  mimeType: string | null;
  status: PlatformDocument["status"];
  rejectionReason: string | null;
  uploadedAt: string;
}

export interface AdminSellerReview {
  id: string;
  company: string;
  status: string;
  onboardingStatus: string | null;
  submittedAt: string | null;
  gstin: string;
  pan: string;
  contact: string;
  email: string;
  phone: string;
  documents: AdminSellerOnboardingDocument[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  admin: string;
  role: AdminRole;
  action: string;
  module: string;
  entity: string;
  result: "Success" | "Failed";
  source: "Admin Portal";
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  time: string;
  href: string;
  source: AppSource;
}

export interface TimelineEvent {
  id: string;
  title: string;
  detail: string;
  time: string;
  source?: AppSource;
}

export type {
  Grade,
  GradeCategory,
  GradeInput,
  GradeStatus,
} from "./grade";

export type {
  PushNotification,
  PushNotificationInput,
  PushPublicPayload,
  PushStatus,
  PushPlatform,
} from "./push-notification";

export type {
  CreditAccount as PlatformCreditAccount,
  CreditApplication,
  CreditAuditEvent,
  CreditDocument,
  CreditInsurance,
  CreditRepayment,
  CreditSummary,
  CreditTransaction,
} from "./credit";

