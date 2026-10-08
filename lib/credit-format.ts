import { formatInrExact } from "@/lib/format";
import { ApiError } from "@/lib/api/client";
import type { AdminRole } from "@/types";
import type { CreditApplicationSource, CreditKycStatus } from "@/types/credit";

export function displayMoney(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "—";
  return formatInrExact(amount);
}

export function displayPercent(value: string | null | undefined) {
  if (value == null || value === "") return "—";
  return `${value}%`;
}

export function canMutateCredit(role: AdminRole | undefined) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "FINANCE";
}

export function creditErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "You need to sign in again to manage credit.";
    if (error.status === 403) return "You are not authorized to perform this credit action.";
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const APPLICATION_STATUSES = [
  "DRAFT",
  "PENDING",
  "DOCUMENTS_UNDER_REVIEW",
  "UNDER_REVIEW",
  "DOCUMENTS_REQUIRED",
  "INSURANCE_REVIEW",
  "CREDIT_ARRANGEMENT_PENDING",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "BLOCKED", "EXPIRED", "CLOSED"] as const;

export const CREDIT_SOURCE_LABELS: Record<CreditApplicationSource, string> = {
  WEBSITE: "Website",
  CUSTOMER_WEB: "Customer Web",
  CUSTOMER_APP: "Customer App",
  SELLER_WEB: "Seller Web",
  SELLER_APP: "Seller App",
  ADMIN: "Admin",
};

export const CREDIT_SOURCES = Object.keys(CREDIT_SOURCE_LABELS) as CreditApplicationSource[];

export function creditSourceLabel(source: CreditApplicationSource | null | undefined) {
  return source ? CREDIT_SOURCE_LABELS[source] : "Not recorded";
}

export const CREDIT_KYC_LABELS: Record<CreditKycStatus, string> = {
  VERIFIED: "Verified",
  PENDING: "Pending",
  FAILED: "Failed",
  MANUAL_REVIEW: "Manual Review",
};

/** Status filter options in the order the credit team works through them. */
export const APPLICATION_STATUS_FILTERS = [
  { value: "PENDING", label: "Submitted" },
  { value: "DOCUMENTS_UNDER_REVIEW", label: "Documents Under Review" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "DOCUMENTS_REQUIRED", label: "Documents Required" },
  { value: "RESUBMISSION_REQUIRED", label: "Resubmission Required" },
  { value: "INSURANCE_REVIEW", label: "Insurance Review" },
  { value: "CREDIT_ARRANGEMENT_PENDING", label: "Credit Arrangement Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "PARTIALLY_APPROVED", label: "Partially Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DRAFT", label: "Draft (not submitted)" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

/** Application status label; PENDING reads as "Submitted" for the credit team. */
export function creditApplicationStatusLabel(value: string | null | undefined) {
  if (value === "PENDING") return "Submitted";
  return humanizeCreditStatus(value);
}

export function humanizeCreditStatus(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function humanizeCreditAction(action: string) {
  return action
    .replace(/^CREDIT_/, "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
