export type CreditApplicationStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "DOCUMENTS_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type CreditAccountStatus = "ACTIVE" | "SUSPENDED" | "BLOCKED" | "EXPIRED" | "CLOSED";

export type CreditEligibilityStatus =
  | "NOT_APPLIED"
  | "PENDING"
  | "UNDER_REVIEW"
  | "DOCUMENTS_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "SUSPENDED"
  | "BLOCKED"
  | "EXPIRED"
  | "CLOSED";

export type CreditTransactionType =
  | "CREDIT_APPROVED"
  | "CREDIT_LIMIT_ADJUSTED"
  | "CREDIT_UTILIZED"
  | "CREDIT_REPAID"
  | "CREDIT_RELEASED"
  | "CREDIT_ADJUSTMENT"
  | "CREDIT_REFUND"
  | "CREDIT_SUSPENDED";

export type CreditInsuranceStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "CLAIMED";

export interface CreditListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreditCustomer {
  id: string;
  organizationId: string;
  name: string;
  businessType: string | null;
  code: string | null;
  gstin: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  verificationStatus: string;
  creditStatus: CreditEligibilityStatus;
  status: string;
}

export interface CreditSummary {
  totalCustomers: number;
  pendingApplications: number;
  approvedAccounts: number;
  activeCredit: number;
  applicationsRequiringAction: number;
  approvedLimit: string;
  availableCredit: string;
  utilizedCredit: string;
  outstandingAmount: string;
  overdueAmount: string;
}

export interface CreditApplication {
  id: string;
  applicationNumber: string;
  status: CreditApplicationStatus;
  requestedLimit: string;
  requestedTenureDays: number | null;
  purpose: string | null;
  currency: string;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  approvedLimit: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  documentCount: number;
  existingExposure: string;
  customer: CreditCustomer;
  creditAccountId: string | null;
  documents?: CreditDocument[];
  audit?: CreditAuditEvent[];
  storage?: { configured: boolean; pending: boolean };
}

export interface CreditAccount {
  id: string;
  accountNumber: string | null;
  status: CreditEligibilityStatus;
  accountStatus: CreditAccountStatus;
  requestedLimit: string | null;
  approvedLimit: string;
  availableLimit: string;
  utilizedAmount: string;
  outstandingAmount: string;
  overdueAmount: string;
  utilizationPercentage: string;
  currency: string;
  creditTermDays: number | null;
  approvedAt: string | null;
  effectiveAt: string | null;
  expiresAt: string | null;
  reviewAt: string | null;
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CreditCustomer;
  insurance: CreditInsurance | null;
  transactions?: CreditTransaction[];
  repayments?: CreditRepayment[];
  documents?: CreditDocument[];
  audit?: CreditAuditEvent[];
  purchaseOrders?: CreditPurchaseOrder[];
  storage?: { configured: boolean; pending: boolean };
}

export interface CreditTransaction {
  id: string;
  transactionNumber: string;
  creditAccountId: string;
  accountNumber: string | null;
  customer: CreditCustomer | null;
  type: CreditTransactionType;
  status: string;
  amount: string;
  currency: string;
  referenceType: string | null;
  referenceId: string | null;
  purchaseOrderId: string | null;
  paymentId: string | null;
  createdBy: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CreditRepayment {
  id: string;
  customer: CreditCustomer;
  creditAccountId: string;
  accountNumber: string | null;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  paymentMethod: string | null;
  paymentReference: string;
  dueAmount: string;
  paidAmount: string;
  remainingAmount: string;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
  sequence: number;
  milestone: string | null;
}

export interface CreditInsurance {
  id: string;
  creditAccountId: string;
  customer: CreditCustomer | null;
  accountNumber?: string | null;
  providerName: string | null;
  policyNumber: string | null;
  coverageAmount: string | null;
  status: CreditInsuranceStatus;
  claimStatus: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  providerIntegration: "PENDING";
  createdAt: string;
  updatedAt: string;
}

export interface CreditDocument {
  id: string;
  documentNumber: string | null;
  fileName: string;
  category: string;
  status: string;
  storageKey: string;
  storageProvider: string;
  storageConfigured: boolean;
  storagePending: boolean;
  ownerType: string;
  ownerId: string;
  organizationId: string | null;
  organizationName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditAuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previousData: unknown;
  newData: unknown;
  actor: string;
  createdAt: string;
}

export interface CreditPurchaseOrder {
  id: string;
  referenceNumber: string;
  paymentMethod: string | null;
  paymentMethodLabel: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  schedules: Array<{
    id: string;
    sequence: number;
    type: string;
    amount: string;
    paidAmount: string;
    remainingAmount: string;
    dueAt: string | null;
    status: string;
    milestone: string | null;
  }>;
}

export interface CustomerCreditSnapshot {
  customerId: string;
  applicationStatus: string;
  account: CreditAccount | null;
}
