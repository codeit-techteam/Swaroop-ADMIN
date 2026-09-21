import { apiRequest } from "@/lib/api/client";
import type {
  CreditAccount,
  CreditApplication,
  CreditAuditEvent,
  CreditDocument,
  CreditInsurance,
  CreditListMeta,
  CreditRepayment,
  CreditSummary,
  CreditTransaction,
  CustomerCreditSnapshot,
} from "@/types/credit";

export type CreditListResult<T> = { items: T[]; meta?: CreditListMeta };

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

export async function getCreditSummary() {
  const { data } = await apiRequest<CreditSummary>("/admin/credit/summary");
  return data;
}

export async function listCreditApplications(params: Record<string, string | number | undefined> = {}) {
  const { data, meta } = await apiRequest<CreditApplication[]>(`/admin/credit/applications${qs(params)}`);
  return { items: data ?? [], meta };
}

export async function getCreditApplication(id: string) {
  const { data } = await apiRequest<CreditApplication>(`/admin/credit/applications/${id}`);
  return data;
}

export async function startCreditReview(id: string) {
  const { data } = await apiRequest<CreditApplication>(`/admin/credit/applications/${id}/start-review`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return data;
}

export async function requestCreditDocuments(id: string, payload: { message?: string; documentTypes?: string[] }) {
  const { data } = await apiRequest<CreditApplication>(`/admin/credit/applications/${id}/request-documents`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function approveCreditApplication(
  id: string,
  payload: { approvedLimit: number; creditTermDays?: number; reviewAt?: string; reason?: string },
) {
  const { data } = await apiRequest<CreditApplication>(`/admin/credit/applications/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function rejectCreditApplication(id: string, reason: string) {
  const { data } = await apiRequest<CreditApplication>(`/admin/credit/applications/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data;
}

export async function listCreditAccounts(params: Record<string, string | number | undefined> = {}) {
  const { data, meta } = await apiRequest<CreditAccount[]>(`/admin/credit/accounts${qs(params)}`);
  return { items: data ?? [], meta };
}

export async function listOutstandingCreditAccounts() {
  const { data } = await apiRequest<{ items: CreditAccount[] }>("/admin/credit/outstanding");
  return data?.items ?? [];
}

export async function getCreditAccount(id: string) {
  const { data } = await apiRequest<CreditAccount>(`/admin/credit/accounts/${id}`);
  return data;
}

export async function adjustCreditLimit(id: string, payload: { newLimit: number; reason: string }) {
  const { data } = await apiRequest<CreditAccount>(`/admin/credit/accounts/${id}/adjust-limit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function suspendCreditAccount(id: string, reason: string) {
  const { data } = await apiRequest<CreditAccount>(`/admin/credit/accounts/${id}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data;
}

export async function reactivateCreditAccount(id: string, reason: string) {
  const { data } = await apiRequest<CreditAccount>(`/admin/credit/accounts/${id}/reactivate`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return data;
}

export async function listCreditUtilization(params: Record<string, string | number | undefined> = {}) {
  const { data, meta } = await apiRequest<CreditAccount[]>(`/admin/credit/utilization${qs(params)}`);
  return { items: data ?? [], meta };
}

export async function listCreditTransactions(params: Record<string, string | number | undefined> = {}) {
  const { data, meta } = await apiRequest<CreditTransaction[]>(`/admin/credit/transactions${qs(params)}`);
  return { items: data ?? [], meta };
}

export async function listCreditRepayments(params: Record<string, string | number | undefined> = {}) {
  const { data, meta } = await apiRequest<CreditRepayment[]>(`/admin/credit/repayments${qs(params)}`);
  return { items: data ?? [], meta };
}

export async function listCreditInsurance(params: Record<string, string | number | undefined> = {}) {
  const { data, meta } = await apiRequest<CreditInsurance[]>(`/admin/credit/insurance${qs(params)}`);
  return { items: data ?? [], meta };
}

export async function listCreditDocuments(params: Record<string, string | number | undefined> = {}) {
  const { data, meta } = await apiRequest<CreditDocument[]>(`/admin/credit/documents${qs(params)}`);
  return { items: data ?? [], meta };
}

export async function listCreditAudit(params: Record<string, string | number | undefined> = {}) {
  const { data, meta } = await apiRequest<CreditAuditEvent[]>(`/admin/credit/audit${qs(params)}`);
  return { items: data ?? [], meta };
}

export async function getCustomerCredit(customerId: string) {
  const { data } = await apiRequest<CustomerCreditSnapshot>(`/admin/credit/customers/${customerId}`);
  return data;
}

export async function downloadCreditDocument(id: string) {
  const { data } = await apiRequest<{
    id: string;
    fileName?: string;
    url?: string | null;
    storageKey?: string;
    storageConfigured: boolean;
    storagePending: boolean;
  }>(`/admin/credit/documents/${id}/download`);
  return data;
}
