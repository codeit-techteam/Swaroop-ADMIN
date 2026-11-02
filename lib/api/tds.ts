import { apiRequest } from "@/lib/api/client";

export type TdsVerificationStatus =
  | "PENDING_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "NEEDS_MAPPING"
  | "MISSING";

export type TdsSourceKind =
  | "APP"
  | "WEB"
  | "WEB_DEALER"
  | "WEB_MULTI_GRADE"
  | "WEB_DOUBTFUL"
  | "IMAGE"
  | "OTHER"
  | "UNKNOWN";

export type TdsRequestStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "FULFILLED"
  | "REJECTED"
  | "CLOSED";

export const TDS_STATUS_LABELS: Record<TdsVerificationStatus, string> = {
  PENDING_REVIEW: "Pending Review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  NEEDS_MAPPING: "Needs Mapping",
  MISSING: "Missing",
};

export const TDS_SOURCE_LABELS: Record<TdsSourceKind, string> = {
  APP: "App",
  WEB: "Web",
  WEB_DEALER: "Web (dealer)",
  WEB_MULTI_GRADE: "Web (multi-grade)",
  WEB_DOUBTFUL: "Web (doubtful)",
  IMAGE: "Image",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

export const TDS_REQUEST_STATUS_LABELS: Record<TdsRequestStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  FULFILLED: "Fulfilled",
  REJECTED: "Rejected",
  CLOSED: "Closed",
};

export interface TdsDocumentGrade {
  id: string;
  code: string;
  name: string;
  manufacturer?: string | null;
  gradeNo?: string | null;
  gradeGroup?: string | null;
  displayName?: string | null;
}

export interface TdsLinkedProduct {
  id: string;
  name: string;
  code?: string | null;
}

export interface TdsDocument {
  id: string;
  gradeId: string | null;
  grade: TdsDocumentGrade | null;
  /** Synced catalogue product name when the grade is mapped to products. */
  productName?: string | null;
  linkedProducts?: TdsLinkedProduct[];
  categoryCode: string;
  gradeCode: string;
  producerName: string;
  /** Display title — synced to product/grade name when mapped. */
  documentTitle: string;
  /** Original library/import title before product-name sync. */
  libraryTitle?: string | null;
  documentType: string;
  originalFilename: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  checksum: string | null;
  sourceKind: TdsSourceKind;
  sourceRaw: string | null;
  sourceUrl: string | null;
  sourceFilePath: string | null;
  workbookAvailability: string | null;
  workbookNotes: string | null;
  verificationStatus: TdsVerificationStatus;
  reviewNotes: string | null;
  revision: number;
  isActive: boolean;
  mappingConfidence: string | null;
  hasFile?: boolean;
  uploadedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TdsDashboard {
  totalGrades: number;
  totalDocuments: number;
  verified: number;
  pendingReview: number;
  missing: number;
  rejected: number;
  needsMapping: number;
  openRequests: number;
  recentImports: Array<{
    id: string;
    status: string;
    dryRun: boolean;
    startedAt: string;
    completedAt: string | null;
    stats: unknown;
    errorMessage: string | null;
  }>;
}

export interface TdsPreview {
  url: string;
  fileName: string | null;
  mimeType: string | null;
}

export interface TdsRequest {
  id: string;
  referenceNumber: string;
  userId: string;
  customerProfileId: string | null;
  gradeId: string;
  status: TdsRequestStatus;
  message: string | null;
  adminNotes: string | null;
  fulfilledDocumentId: string | null;
  assignedToUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  grade?: {
    id: string;
    code: string;
    name: string;
    displayName: string | null;
  } | null;
}

export interface ListTdsDocumentsParams {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  producer?: string;
  status?: TdsVerificationStatus;
  sourceKind?: TdsSourceKind;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function pagesFromMeta(meta: { page?: number; limit?: number; total?: number; totalPages?: number } | undefined, fallbackLimit: number) {
  if (meta?.totalPages) return meta.totalPages;
  if (meta?.total != null && meta.limit) return Math.max(1, Math.ceil(meta.total / meta.limit));
  if (meta?.total != null) return Math.max(1, Math.ceil(meta.total / fallbackLimit));
  return 1;
}

function normalizeDocument(raw: TdsDocument & { fileSizeBytes?: number | string | null; hasFile?: boolean; storageKey?: string | null }): TdsDocument {
  const size = raw.fileSizeBytes;
  return {
    ...raw,
    fileSizeBytes:
      size == null ? null : typeof size === "string" ? Number(size) || null : size,
    hasFile: raw.hasFile ?? Boolean(raw.storageKey),
  };
}

export async function getTdsDashboard() {
  const { data } = await apiRequest<TdsDashboard>("/admin/tds/dashboard");
  return data;
}

export async function listTdsDocuments(params: ListTdsDocumentsParams = {}) {
  const limit = params.limit ?? 100;
  const { data, meta } = await apiRequest<TdsDocument[]>(
    `/admin/tds/documents${buildQuery({ ...params, page: params.page ?? 1, limit })}`,
  );
  return {
    items: (data ?? []).map(normalizeDocument),
    meta: {
      page: meta?.page ?? params.page ?? 1,
      limit: meta?.limit ?? limit,
      total: meta?.total ?? data?.length ?? 0,
      totalPages: pagesFromMeta(meta, limit),
    },
  };
}

/** Fetch documents across pages (capped) for workbench-style UIs. */
export async function listAllTdsDocuments(
  params: Omit<ListTdsDocumentsParams, "page" | "limit"> = {},
  options?: { pageSize?: number; maxPages?: number },
) {
  const pageSize = options?.pageSize ?? 100;
  const maxPages = options?.maxPages ?? 20;
  const rows: TdsDocument[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { items, meta } = await listTdsDocuments({ ...params, page, limit: pageSize });
    rows.push(...items);
    totalPages = meta.totalPages;
    page += 1;
  } while (page <= totalPages && page <= maxPages);
  return rows;
}

export async function getTdsDocument(id: string) {
  const { data } = await apiRequest<TdsDocument>(`/admin/tds/documents/${id}`);
  return normalizeDocument(data);
}

export async function getTdsPreview(id: string) {
  const { data } = await apiRequest<TdsPreview>(`/admin/tds/documents/${id}/preview`);
  return data;
}

const post = async <T>(path: string, body: unknown = {}) => {
  const { data } = await apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data;
};

export const approveTdsDocument = (id: string, notes?: string) =>
  post<TdsDocument>(`/admin/tds/documents/${id}/approve`, notes ? { notes } : {});

export const rejectTdsDocument = (id: string, reason: string) =>
  post<TdsDocument>(`/admin/tds/documents/${id}/reject`, { reason });

export const mapTdsDocumentGrade = (id: string, gradeId: string, notes?: string) =>
  post<TdsDocument>(`/admin/tds/documents/${id}/map-grade`, {
    gradeId,
    ...(notes ? { notes } : {}),
  });

export async function listTdsRequests(params?: {
  page?: number;
  limit?: number;
  status?: TdsRequestStatus;
}) {
  const limit = params?.limit ?? 100;
  const { data, meta } = await apiRequest<TdsRequest[]>(
    `/admin/tds/requests${buildQuery({
      page: params?.page ?? 1,
      limit,
      status: params?.status,
    })}`,
  );
  return {
    items: data ?? [],
    meta: {
      page: meta?.page ?? params?.page ?? 1,
      limit: meta?.limit ?? limit,
      total: meta?.total ?? data?.length ?? 0,
      totalPages: pagesFromMeta(meta, limit),
    },
  };
}

export async function listAllTdsRequests(
  status?: TdsRequestStatus,
  options?: { pageSize?: number; maxPages?: number },
) {
  const pageSize = options?.pageSize ?? 100;
  const maxPages = options?.maxPages ?? 10;
  const rows: TdsRequest[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { items, meta } = await listTdsRequests({ page, limit: pageSize, status });
    rows.push(...items);
    totalPages = meta.totalPages;
    page += 1;
  } while (page <= totalPages && page <= maxPages);
  return rows;
}

export type TdsUploadInput = {
  file: File;
  productId?: string;
  gradeId?: string;
  notes?: string;
  /** Publish immediately to customers / sellers */
  approveNow?: boolean;
};

async function postTdsMultipart(path: string, input: TdsUploadInput) {
  if (!input.productId && !input.gradeId) {
    throw new Error("Select a product or grade before uploading.");
  }
  const body = new FormData();
  body.append("file", input.file);
  if (input.productId) body.append("productId", input.productId);
  if (input.gradeId) body.append("gradeId", input.gradeId);
  if (input.notes?.trim()) body.append("notes", input.notes.trim());
  if (input.approveNow) body.append("approveNow", "true");
  const { data } = await apiRequest<TdsDocument>(path, { method: "POST", body });
  return normalizeDocument(data);
}

/** Upload a new TDS linked to a marketplace product (preferred) or grade. */
export function uploadTdsDocument(input: TdsUploadInput) {
  return postTdsMultipart("/admin/tds/documents/upload", input);
}

/** Replace file on an existing TDS row (revision). */
export function replaceTdsDocument(id: string, input: TdsUploadInput) {
  return postTdsMultipart(`/admin/tds/documents/${id}/replace`, input);
}

export type AdminProductOption = {
  id: string;
  name: string;
  code: string;
  manufacturer: string | null;
  gradeId: string | null;
  gradeName: string | null;
  gradeCode: string | null;
};

/** Product picker for TDS upload — searches admin products by name/code. */
export async function searchProductsForTds(query: string, limit = 20) {
  const q = query.trim();
  const { data } = await apiRequest<
    Array<{
      id: string;
      name: string;
      code: string;
      manufacturer?: string | null;
      brand?: string | null;
      gradeId?: string | null;
      grade?: { id?: string; name?: string; code?: string; displayName?: string | null } | null;
    }>
  >(
    `/admin/products${buildQuery({
      page: 1,
      limit,
      ...(q ? { search: q } : {}),
    })}`,
  );
  return (data ?? []).map(
    (p): AdminProductOption => ({
      id: p.id,
      name: p.name,
      code: p.code,
      manufacturer: p.manufacturer ?? p.brand ?? null,
      gradeId: p.gradeId ?? p.grade?.id ?? null,
      gradeName: p.grade?.displayName ?? p.grade?.name ?? null,
      gradeCode: p.grade?.code ?? null,
    }),
  );
}

export const updateTdsRequest = (
  id: string,
  input: {
    status?: TdsRequestStatus;
    adminNotes?: string;
    assignedToUserId?: string;
    fulfilledDocumentId?: string;
  },
) => post<TdsRequest>(`/admin/tds/requests/${id}`, input);

export type TdsStorageSyncResult = {
  prefix: string;
  autoVerify: boolean;
  done: boolean;
  continuationToken: string | null;
  limit: number;
  scanned: number;
  skipped: number;
  created: number;
  updated: number;
  verified: number;
  needsMapping: number;
  fulfilledRequests: number;
  sample: string[];
};

type SyncProgress = {
  chunk: number;
  totals: Omit<
    TdsStorageSyncResult,
    "prefix" | "autoVerify" | "done" | "continuationToken" | "limit" | "sample"
  >;
};

/**
 * Scan R2 `tds/` in chunks (DO gateway kills long requests) until done.
 * Optional onProgress for UI status while looping.
 */
export async function syncTdsFromStorage(input?: {
  autoVerify?: boolean;
  prefix?: string;
  limit?: number;
  onProgress?: (progress: SyncProgress) => void;
}) {
  const totals = {
    scanned: 0,
    skipped: 0,
    created: 0,
    updated: 0,
    verified: 0,
    needsMapping: 0,
    fulfilledRequests: 0,
  };
  let continuationToken: string | undefined;
  let chunk = 0;
  let last: TdsStorageSyncResult | null = null;

  do {
    chunk += 1;
    const { data } = await apiRequest<TdsStorageSyncResult>(
      "/admin/tds/documents/sync-storage",
      {
        method: "POST",
        body: JSON.stringify({
          autoVerify: input?.autoVerify ?? true,
          limit: input?.limit ?? 80,
          ...(input?.prefix ? { prefix: input.prefix } : {}),
          ...(continuationToken
            ? { continuationToken }
            : {}),
        }),
      },
    );
    last = data;
    totals.scanned += data.scanned;
    totals.skipped += data.skipped;
    totals.created += data.created;
    totals.updated += data.updated;
    totals.verified += data.verified;
    totals.needsMapping += data.needsMapping;
    totals.fulfilledRequests += data.fulfilledRequests;
    input?.onProgress?.({ chunk, totals: { ...totals } });
    continuationToken = data.done
      ? undefined
      : data.continuationToken ?? undefined;
    // Safety: never infinite-loop if API forgets to mark done.
    if (chunk >= 500) break;
  } while (continuationToken);

  return {
    prefix: last?.prefix ?? "tds/",
    autoVerify: last?.autoVerify ?? true,
    done: true,
    continuationToken: null,
    limit: last?.limit ?? input?.limit ?? 80,
    ...totals,
    sample: last?.sample ?? [],
  } satisfies TdsStorageSyncResult;
}
