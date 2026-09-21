import { apiRequest } from "@/lib/api/client";
import {
  emptyUsage,
  setCategoryCache,
  toPublicGrade,
} from "@/lib/grade-utils";
import type {
  Grade,
  GradeBulkAction,
  GradeCategory,
  GradeInput,
  GradeListQuery,
  GradeParentGroup,
  GradePublicPayload,
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
};

type BackendCategory = {
  id: string;
  code: string;
  name: string;
  displayName?: string | null;
  parentGroup?: string;
  description?: string | null;
};

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

let cache: Grade[] = [];
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
    gradeName: item.name,
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
  };
}

function wrap(error: unknown, fallback: string): never {
  const message = error instanceof Error ? error.message : fallback;
  throw new GradeServiceError(message);
}

export function getGradesSync(): Grade[] {
  return cache.map((item) => structuredClone(item));
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

export async function getGrades(_query?: GradeListQuery): Promise<Grade[]> {
  try {
    await getCategories();
    const pages: Grade[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const { data, meta } = await apiRequest<BackendGrade[]>(
        `/admin/grades?page=${page}&limit=100&sortBy=sortOrder&sortOrder=asc`,
      );
      pages.push(...(data ?? []).map(mapGrade));
      totalPages = meta?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages && page <= 10);
    cache = pages;
    return getGradesSync();
  } catch (error) {
    wrap(error, "Unable to load Grade Master.");
  }
}

export async function getGradeById(id: string): Promise<Grade | undefined> {
  try {
    const { data } = await apiRequest<BackendGrade>(`/admin/grades/${id}`);
    return mapGrade(data);
  } catch {
    return cache.find((item) => item.id === id || item.gradeCode === id);
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

export async function createGrade(input: GradeInput, _actor = "Admin"): Promise<Grade> {
  try {
    const { data } = await apiRequest<BackendGrade>("/admin/grades", {
      method: "POST",
      body: JSON.stringify(toCreateBody(input)),
    });
    const grade = mapGrade(data);
    cache = [grade, ...cache.filter((item) => item.id !== grade.id)];
    return structuredClone(grade);
  } catch (error) {
    wrap(error, "Unable to create grade.");
  }
}

export async function updateGrade(
  id: string,
  input: Partial<GradeInput>,
  _actor = "Admin",
): Promise<Grade> {
  try {
    const body: Record<string, unknown> = {};
    if (input.gradeCode) body.code = input.gradeCode;
    if (input.gradeName) {
      body.name = input.gradeName;
      body.displayName = input.gradeName;
    }
    if (input.categoryId) body.categoryId = input.categoryId;
    if (input.description !== undefined) body.description = input.description;
    if (input.applications) body.applicationCodes = input.applications;
    if (input.status) body.status = input.status;
    if (input.customerVisible !== undefined) body.customerVisible = input.customerVisible;
    if (input.sellerVisible !== undefined) body.sellerVisible = input.sellerVisible;
    if (input.sortOrder !== undefined) body.sortOrder = input.sortOrder;
    const { data } = await apiRequest<BackendGrade>(`/admin/grades/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const grade = mapGrade(data);
    cache = cache.map((item) => (item.id === id ? grade : item));
    return structuredClone(grade);
  } catch (error) {
    wrap(error, "Unable to update grade.");
  }
}

export async function updateGradeStatus(id: string, status: GradeStatus, actor = "Admin") {
  return updateGrade(id, { status }, actor);
}

export async function updateVisibility(
  id: string,
  visibility: { customerVisible?: boolean; sellerVisible?: boolean },
  _actor = "Admin",
): Promise<Grade> {
  try {
    const { data } = await apiRequest<BackendGrade>(`/admin/grades/${id}/visibility`, {
      method: "PATCH",
      body: JSON.stringify(visibility),
    });
    const grade = mapGrade(data);
    cache = cache.map((item) => (item.id === id ? grade : item));
    return structuredClone(grade);
  } catch (error) {
    wrap(error, "Unable to update visibility.");
  }
}

export async function deleteGrade(id: string): Promise<void> {
  try {
    await apiRequest(`/admin/grades/${id}`, { method: "DELETE" });
    cache = cache.filter((item) => item.id !== id);
  } catch (error) {
    wrap(error, "Unable to delete grade.");
  }
}

export async function bulkUpdateGrades(
  ids: string[],
  action: GradeBulkAction,
  actor = "Admin",
): Promise<Grade[]> {
  const updated: Grade[] = [];
  for (const id of ids) {
    if (action === "ACTIVATE") updated.push(await updateGradeStatus(id, "ACTIVE", actor));
    if (action === "DEACTIVATE") updated.push(await updateGradeStatus(id, "INACTIVE", actor));
    if (action === "CUSTOMER_VISIBLE")
      updated.push(await updateVisibility(id, { customerVisible: true }, actor));
    if (action === "CUSTOMER_HIDDEN")
      updated.push(await updateVisibility(id, { customerVisible: false }, actor));
    if (action === "SELLER_VISIBLE")
      updated.push(await updateVisibility(id, { sellerVisible: true }, actor));
    if (action === "SELLER_HIDDEN")
      updated.push(await updateVisibility(id, { sellerVisible: false }, actor));
  }
  return updated;
}

export async function importGrades(inputs: GradeInput[], actor = "Admin"): Promise<Grade[]> {
  const created: Grade[] = [];
  for (const input of inputs) {
    created.push(await createGrade(input, actor));
  }
  return created;
}

export async function getCustomerVisibleGrades(): Promise<GradePublicPayload[]> {
  const grades = cache.length ? cache : await getGrades();
  return grades
    .filter((item) => item.status === "ACTIVE" && item.customerVisible)
    .map(toPublicGrade);
}

export async function getSellerVisibleGrades(): Promise<GradePublicPayload[]> {
  const grades = cache.length ? cache : await getGrades();
  return grades
    .filter((item) => item.status === "ACTIVE" && item.sellerVisible)
    .map(toPublicGrade);
}

export async function exportGrades(grades: Grade[]): Promise<Grade[]> {
  return grades.map((item) => structuredClone(item));
}

export function getCategoryCache(): GradeCategory[] {
  return categoryCache.map((item) => structuredClone(item));
}
