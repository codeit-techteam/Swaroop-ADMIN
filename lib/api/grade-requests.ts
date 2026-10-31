import { apiRequest } from "@/lib/api/client";

export type GradeRequestStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INFO_REQUIRED"
  | "GRADE_IDENTIFIED"
  | "QUOTATION_AVAILABLE"
  | "CONVERTED_TO_PR"
  | "REJECTED"
  | "CLOSED";

export const GRADE_REQUEST_STATUS_LABELS: Record<GradeRequestStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  INFO_REQUIRED: "Additional Information Required",
  GRADE_IDENTIFIED: "Grade Identified",
  QUOTATION_AVAILABLE: "Quotation Available",
  CONVERTED_TO_PR: "Converted to Purchase Request",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

/** Mirrors the backend transition table (the server is still the authority). */
export const GRADE_REQUEST_TRANSITIONS: Record<GradeRequestStatus, GradeRequestStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "INFO_REQUIRED", "GRADE_IDENTIFIED", "REJECTED", "CLOSED"],
  UNDER_REVIEW: ["INFO_REQUIRED", "GRADE_IDENTIFIED", "QUOTATION_AVAILABLE", "REJECTED", "CLOSED"],
  INFO_REQUIRED: ["UNDER_REVIEW", "REJECTED", "CLOSED"],
  GRADE_IDENTIFIED: ["UNDER_REVIEW", "QUOTATION_AVAILABLE", "CONVERTED_TO_PR", "CLOSED"],
  QUOTATION_AVAILABLE: ["UNDER_REVIEW", "CONVERTED_TO_PR", "CLOSED"],
  CONVERTED_TO_PR: [],
  REJECTED: [],
  CLOSED: [],
};

/** Statuses the generic status endpoint accepts (others use dedicated actions). */
export const DIRECT_STATUSES: GradeRequestStatus[] = [
  "UNDER_REVIEW",
  "QUOTATION_AVAILABLE",
  "CONVERTED_TO_PR",
  "REJECTED",
  "CLOSED",
];
export const REASON_REQUIRED: GradeRequestStatus[] = ["REJECTED", "CLOSED"];

export interface GradeRequestTimelineEvent {
  id: string;
  type: string;
  fromStatus: GradeRequestStatus | null;
  toStatus: GradeRequestStatus | null;
  actorRole: string;
  actorUserId: string | null;
  actorName: string | null;
  message: string | null;
  internal: boolean;
  createdAt: string;
}

export interface GradeRequestDocument {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: string | null;
  documentType: string;
  createdAt: string;
}

export interface GradeRequest {
  id: string;
  referenceNumber: string;
  status: GradeRequestStatus;
  statusLabel: string;
  isOpen: boolean;
  customer: {
    customerProfileId: string;
    organizationId: string;
    companyName: string;
    accountEmail: string | null;
    accountPhone: string | null;
  };
  contact: { name: string; phone: string; email: string | null };
  gradeName: string;
  materialCategory: string;
  category: { id: string; code: string; name: string } | null;
  manufacturer: string | null;
  gradeGroup: string | null;
  application: string | null;
  technicalSpecs: string | null;
  remarks: string | null;
  quantity: string;
  unit: string;
  deliveryLocation: string;
  deliveryPincode: string | null;
  requiredByDate: string | null;
  preferredPackaging: string | null;
  assignedAdmin: { id: string; name: string } | null;
  resolvedGrade: {
    id: string;
    code: string;
    name: string;
    displayName: string | null;
    status: string;
    customerVisible: boolean;
    sellerVisible: boolean;
  } | null;
  resolutionType: string | null;
  adminMessage: string | null;
  customerResponse: string | null;
  closureReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
}

export interface GradeRequestDetail extends GradeRequest {
  timeline: GradeRequestTimelineEvent[];
  documents: GradeRequestDocument[];
}

export interface GradeRequestSummary {
  byStatus: Record<GradeRequestStatus, number>;
  open: number;
  unassigned: number;
}

export async function listGradeRequests(): Promise<GradeRequest[]> {
  const rows: GradeRequest[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, meta } = await apiRequest<{ items: GradeRequest[] } | GradeRequest[]>(
      `/admin/grade-requests?page=${page}&limit=100`,
    );
    const items = Array.isArray(data) ? data : (data?.items ?? []);
    rows.push(...items);
    totalPages = meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 20);
  return rows;
}

export async function getGradeRequestSummary() {
  const { data } = await apiRequest<GradeRequestSummary>("/admin/grade-requests/summary");
  return data;
}

export async function getGradeRequest(id: string) {
  const { data } = await apiRequest<GradeRequestDetail>(`/admin/grade-requests/${id}`);
  return data;
}

const post = async <T>(path: string, body: unknown = {}) => {
  const { data } = await apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) });
  return data;
};

export const assignGradeRequest = (id: string, adminUserId?: string) =>
  post<GradeRequestDetail>(`/admin/grade-requests/${id}/assign`, adminUserId ? { adminUserId } : {});

export const updateGradeRequestStatus = (id: string, status: GradeRequestStatus, message?: string) =>
  post<GradeRequestDetail>(`/admin/grade-requests/${id}/status`, { status, message });

export const requestGradeRequestInfo = (id: string, message: string) =>
  post<GradeRequestDetail>(`/admin/grade-requests/${id}/request-info`, { message });

export const addGradeRequestNote = (id: string, note: string) =>
  post<GradeRequestDetail>(`/admin/grade-requests/${id}/notes`, { note });

export const mapGradeRequestToGrade = (
  id: string,
  input: { gradeId: string; message?: string; note?: string },
) => post<GradeRequestDetail>(`/admin/grade-requests/${id}/map-grade`, input);

export interface CreateGradeFromRequestInput {
  code: string;
  name: string;
  categoryId: string;
  displayName?: string;
  manufacturer?: string;
  gradeGroup?: string;
  gradeNo?: string;
  description?: string;
  message?: string;
}

export const createGradeFromRequest = (id: string, input: CreateGradeFromRequestInput) =>
  post<{
    request: GradeRequestDetail;
    grade: { id: string; code: string };
    publicationRequired: boolean;
    note: string;
  }>(
    `/admin/grade-requests/${id}/create-grade`,
    input,
  );

export async function getGradeRequestDocumentUrl(id: string, documentId: string) {
  const { data } = await apiRequest<{ url: string | null; storageConfigured?: boolean }>(
    `/admin/grade-requests/${id}/documents/${documentId}/download`,
  );
  return data;
}
