import { formatInrExact } from "@/lib/format";
import { ApiError } from "@/lib/api/client";
import type { AdminRole } from "@/types";

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
