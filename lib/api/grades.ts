import { apiRequest } from "@/lib/api/client";
import { emptyUsage, setCategoryCache } from "@/lib/grade-utils";
import type {
  Grade,
  GradeBulkAction,
  GradeCategory,
  GradeFacets,
  GradeFilters,
  GradeImportBatch,
  GradeImportSummary,
  GradeInput,
  GradeParentGroup,
  GradeSort,
  GradeStats,
  GradeStatus,
} from "@/types/grade";

export class GradeServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GradeServiceError";
  }
}

type BackendGrade = {
  id: string;
  code: string;
  name: string;
  displayName?: string;
  description?: string | null;
  status: GradeStatus;
  customerVisible: boolean;
  sellerVisible: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  createdById?: string | null;
  updatedById?: string | null;
  category?: {
    id: string;
    code: string;
    name: string;
    displayName?: string;
    parentGroup?: string;
  } | null;
  applications?: Array<{ id: string; code: string; name: string }>;
  gradeNo?: string | null;
  gradeGroup?: string | null;
  manufacturer?: string | null;
  fullGradeName?: string | null;
  inTodaysDelhiPriceList?: boolean;
  priceTodayRsKg?: string | null;
  producerPriceRsKg?: string | null;
  producerPriceType?: string | null;
  source?: string | null;
  sourceReference?: string | null;
  version?: number;
  lastImportedAt?: string | null;
};

type BackendCategory = {
  id: string;
  code: string;
  name: string;
  displayName?: string | null;
  parentGroup?: string;
  description?: string | null;
};

export type GradePageMeta = { page: number; limit: number; total: number; totalPages: number };

const PARENT_GROUP_MAP: Record<string, GradeParentGroup> = {
  POLYMERS: "Polymers",
  COMPOUNDS: "Compounds",
  MASTERBATCH: "Masterbatch",
  ELASTOMERS: "Elastomers",
  CHEMICALS: "Chemicals",
  SOLVENTS: "Solvents",
  INTERMEDIATES: "Intermediates",
  RECYCLED: "Recycled",
  BASE_OILS: "Base Oils",
  SPECIALTY: "Specialty",
};

const SORT_FIELD: Record<GradeSort["key"], string> = {
  gradeCode: "code",
  gradeName: "displayName",
  gradeNo: "gradeNo",
  manufacturer: "manufacturer",
  gradeGroup: "gradeGroup",
  sortOrder: "sortOrder",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

let categoryCache: GradeCategory[] = [];

function mapCategory(item: BackendCategory): GradeCategory {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    parentGroup: PARENT_GROUP_MAP[item.parentGroup ?? ""] ?? "Specialty",
    description: item.description ?? undefined,
  };
}

function mapGrade(item: BackendGrade): Grade {
  return {
    id: item.id,
    gradeCode: item.code,
    gradeName: item.displayName || item.name,
    categoryId: item.category?.id ?? "",
    categoryName: item.category?.name ?? item.category?.code ?? "",
    description: item.description ?? undefined,
    applications: (item.applications ?? []).map((app) => app.name),
    status: item.status,
    customerVisible: item.customerVisible,
    sellerVisible: item.sellerVisible,
    sortOrder: item.sortOrder ?? 0,
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? new Date().toISOString(),
    createdBy: item.createdById ?? undefined,
    updatedBy: item.updatedById ?? undefined,
    usage: emptyUsage(),
    gradeNo: item.gradeNo ?? null,
    gradeGroup: item.gradeGroup ?? null,
    manufacturer: item.manufacturer ?? null,
    fullGradeName: item.fullGradeName ?? null,
    inTodaysDelhiPriceList: Boolean(item.inTodaysDelhiPriceList),
    priceTodayRsKg: item.priceTodayRsKg ?? null,
    producerPriceRsKg: item.producerPriceRsKg ?? null,
    producerPriceType: item.producerPriceType ?? null,
    source: item.source ?? null,
    sourceReference: item.sourceReference ?? null,
    version: item.version ?? 1,
    lastImportedAt: item.lastImportedAt ?? null,
  };
}

function wrap(error: unknown, fallback: string): never {
  const message = error instanceof Error ? error.message : fallback;
  throw new GradeServiceError(message);
}

export async function getCategories(): Promise<GradeCategory[]> {
  try {
    const { data } = await apiRequest<BackendCategory[]>(
      "/master-data/categories?limit=100&sortBy=sortOrder&sortOrder=asc",
    );
    categoryCache = (data ?? []).map(mapCategory);
    setCategoryCache(categoryCache);
    return categoryCache.map((item) => structuredClone(item));
  } catch (error) {
    wrap(error, "Unable to load categories.");
  }
}

export function gradeQueryString(
  filters: GradeFilters,
  sort: GradeSort,
  page: number,
  limit: number,
): string {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sortBy: SORT_FIELD[sort.key] ?? "updatedAt",
    sortOrder: sort.dir,
  });
  const search = filters.search.trim();
  if (search) params.set("search", search);
  if (filters.categoryId !== "ALL") params.set("categoryId", filters.categoryId);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.customerVisible !== "ALL")
    params.set("customerVisible", String(filters.customerVisible === "VISIBLE"));
  if (filters.sellerVisible !== "ALL")
    params.set("sellerVisible", String(filters.sellerVisible === "VISIBLE"));
  if (filters.gradeGroup !== "ALL") params.set("gradeGroup", filters.gradeGroup);
  if (filters.manufacturer !== "ALL") params.set("manufacturer", filters.manufacturer);
  if (filters.inTodaysDelhiPriceList !== "ALL")
    params.set("inTodaysDelhiPriceList", String(filters.inTodaysDelhiPriceList === "YES"));
  return params.toString();
}

/** One server-side page of the Grade Master; search, filters and sorting run in the database. */
export async function listGrades(
  filters: GradeFilters,
  sort: GradeSort,
  page: number,
  limit: number,
): Promise<{ grades: Grade[]; meta: GradePageMeta }> {
  try {
    const { data, meta } = await apiRequest<BackendGrade[]>(
      `/admin/grades?${gradeQueryString(filters, sort, page, limit)}`,
    );
    const grades = (data ?? []).map(mapGrade);
    return {
      grades,
      meta: meta ?? { page, limit, total: grades.length, totalPages: 1 },
    };
  } catch (error) {
    wrap(error, "Unable to load Grade Master.");
  }
}

/** Every grade matching the filters, page by page, for explicit exports. */
export async function listAllGrades(filters: GradeFilters, sort: GradeSort): Promise<Grade[]> {
  const all: Grade[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { grades, meta } = await listGrades(filters, sort, page, 100);
    all.push(...grades);
    totalPages = meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return all;
}

export async function getGradeStats(): Promise<GradeStats> {
  try {
    const { data } = await apiRequest<GradeStats>("/admin/grades/stats");
    return data;
  } catch (error) {
    wrap(error, "Unable to load grade statistics.");
  }
}

export async function getGradeFacets(categoryId?: string): Promise<GradeFacets> {
  try {
    const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
    const { data } = await apiRequest<GradeFacets>(`/admin/grades/facets${query}`);
    return { gradeGroups: data.gradeGroups ?? [], manufacturers: data.manufacturers ?? [] };
  } catch (error) {
    wrap(error, "Unable to load grade filters.");
  }
}

export async function getGradeById(id: string): Promise<Grade> {
  try {
    const { data } = await apiRequest<BackendGrade>(`/admin/grades/${id}`);
    return mapGrade(data);
  } catch (error) {
    wrap(error, "Unable to load grade.");
  }
}

function toCreateBody(input: GradeInput) {
  return {
    code: input.gradeCode,
    name: input.gradeName,
    displayName: input.gradeName,
    categoryId: input.categoryId,
    description: input.description,
    applicationCodes: input.applications,
    status: input.status,
    customerVisible: input.customerVisible,
    sellerVisible: input.sellerVisible,
    sortOrder: input.sortOrder,
  };
}

export async function createGrade(input: GradeInput): Promise<Grade> {
  try {
    const { data } = await apiRequest<BackendGrade>("/admin/grades", {
      method: "POST",
      body: JSON.stringify(toCreateBody(input)),
    });
    return mapGrade(data);
  } catch (error) {
    wrap(error, "Unable to create grade.");
  }
}

/**
 * Sends only fields that differ from `before`. Imported grades keep their
 * Source.One name/code/category; only the display label is editable.
 */
export async function updateGrade(id: string, input: Partial<GradeInput>, before?: Grade): Promise<Grade> {
  try {
    const imported = Boolean(before?.source);
    const changed = <K extends keyof GradeInput>(key: K) =>
      input[key] !== undefined && (!before || JSON.stringify(input[key]) !== JSON.stringify(before[key]));
    const body: Record<string, unknown> = {};
    if (changed("gradeCode") && !imported) body.code = input.gradeCode;
    if (changed("gradeName")) {
      body.displayName = input.gradeName;
      if (!imported) body.name = input.gradeName;
    }
    if (changed("categoryId") && !imported) body.categoryId = input.categoryId;
    if (changed("description")) body.description = input.description;
    if (changed("applications")) body.applicationCodes = input.applications;
    if (changed("status")) body.status = input.status;
    if (changed("customerVisible")) body.customerVisible = input.customerVisible;
    if (changed("sellerVisible")) body.sellerVisible = input.sellerVisible;
    if (changed("sortOrder")) body.sortOrder = input.sortOrder;
    const { data } = await apiRequest<BackendGrade>(`/admin/grades/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return mapGrade(data);
  } catch (error) {
    wrap(error, "Unable to update grade.");
  }
}

export async function updateGradeStatus(id: string, status: GradeStatus): Promise<Grade> {
  try {
    const { data } = await apiRequest<BackendGrade>(`/admin/grades/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return mapGrade(data);
  } catch (error) {
    wrap(error, "Unable to update status.");
  }
}

export async function updateVisibility(
  id: string,
  visibility: { customerVisible?: boolean; sellerVisible?: boolean },
): Promise<Grade> {
  try {
    const { data } = await apiRequest<BackendGrade>(`/admin/grades/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify(visibility),
    });
    return mapGrade(data);
  } catch (error) {
    wrap(error, "Unable to update visibility.");
  }
}

export async function deleteGrade(id: string): Promise<void> {
  try {
    await apiRequest(`/admin/grades/${id}`, { method: "DELETE" });
  } catch (error) {
    wrap(error, "Unable to delete grade.");
  }
}

export async function bulkUpdateGrades(ids: string[], action: GradeBulkAction): Promise<Grade[]> {
  const updated: Grade[] = [];
  for (const id of ids) {
    if (action === "ACTIVATE") updated.push(await updateGradeStatus(id, "ACTIVE"));
    if (action === "DEACTIVATE") updated.push(await updateGradeStatus(id, "INACTIVE"));
    if (action === "CUSTOMER_VISIBLE") updated.push(await updateVisibility(id, { customerVisible: true }));
    if (action === "CUSTOMER_HIDDEN") updated.push(await updateVisibility(id, { customerVisible: false }));
    if (action === "SELLER_VISIBLE") updated.push(await updateVisibility(id, { sellerVisible: true }));
    if (action === "SELLER_HIDDEN") updated.push(await updateVisibility(id, { sellerVisible: false }));
  }
  return updated;
}

/** Uploads a Source.One CSV; the backend validates, de-duplicates and upserts it in one transaction. */
export async function importGradeCsv(file: File, dryRun: boolean): Promise<GradeImportSummary> {
  try {
    const body = new FormData();
    body.append("file", file);
    const { data } = await apiRequest<GradeImportSummary>(
      `/admin/grades/import${dryRun ? "?dryRun=true" : ""}`,
      { method: "POST", body },
    );
    return data;
  } catch (error) {
    wrap(error, "Grade import failed.");
  }
}

export async function listGradeImports(page = 1, limit = 10): Promise<GradeImportBatch[]> {
  try {
    const { data } = await apiRequest<GradeImportBatch[]>(
      `/admin/grade-imports?page=${page}&limit=${limit}`,
    );
    return data ?? [];
  } catch (error) {
    wrap(error, "Unable to load import history.");
  }
}

export function getCategoryCache(): GradeCategory[] {
  return categoryCache.map((item) => structuredClone(item));
}
