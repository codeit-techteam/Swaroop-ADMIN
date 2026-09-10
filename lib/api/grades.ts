import { categoryById, emptyUsage, normalizeGradeCode, toPublicGrade } from "@/lib/grade-utils";
import { grades as seedGrades } from "@/lib/mock-data/grades";
import { delay } from "@/lib/utils";
import type {
  Grade,
  GradeBulkAction,
  GradeInput,
  GradeListQuery,
  GradePublicPayload,
  GradeStatus,
} from "@/types/grade";

export class GradeServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GradeServiceError";
  }
}

let records: Grade[] = structuredClone(seedGrades);

function clone(list: Grade[]) {
  return structuredClone(list);
}

function nextId() {
  const nums = records
    .map((item) => Number(item.id.replace("GRD-", "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `GRD-${max + 1}`;
}

function hydrateInput(input: GradeInput, actor: string, existing?: Grade): Grade {
  const category = categoryById(input.categoryId);
  if (!category) throw new GradeServiceError("Category is required.");
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? nextId(),
    gradeCode: normalizeGradeCode(input.gradeCode),
    gradeName: input.gradeName.trim(),
    categoryId: category.id,
    categoryName: category.name,
    description: input.description?.trim() || undefined,
    applications: input.applications.map((item) => item.trim()).filter(Boolean),
    status: input.status,
    customerVisible: input.customerVisible,
    sellerVisible: input.sellerVisible,
    sortOrder: input.sortOrder,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? actor,
    updatedBy: actor,
    usage: existing?.usage ?? emptyUsage(),
  };
}

function assertUniqueCode(code: string, ignoreId?: string) {
  const exists = records.some((item) => item.gradeCode === code && item.id !== ignoreId);
  if (exists) throw new GradeServiceError("Grade code already exists.");
}

export function getGradesSync(): Grade[] {
  return clone(records);
}

export async function getGrades(_query?: GradeListQuery): Promise<Grade[]> {
  await delay(320);
  return clone(records);
}

export async function getGradeById(id: string): Promise<Grade | undefined> {
  await delay(180);
  const found = records.find((item) => item.id === id || item.gradeCode === id);
  return found ? structuredClone(found) : undefined;
}

function insertGrade(input: GradeInput, actor: string): Grade {
  const grade = hydrateInput(input, actor);
  if (!grade.gradeCode) throw new GradeServiceError("Grade code is required.");
  if (!grade.gradeName) throw new GradeServiceError("Grade name is required.");
  assertUniqueCode(grade.gradeCode);
  records = [grade, ...records];
  return structuredClone(grade);
}

function patchGrade(id: string, input: Partial<GradeInput>, actor: string): Grade {
  const index = records.findIndex((item) => item.id === id);
  if (index < 0) throw new GradeServiceError("Grade not found.");
  const current = records[index]!;
  const next = hydrateInput(
    {
      gradeCode: input.gradeCode ?? current.gradeCode,
      gradeName: input.gradeName ?? current.gradeName,
      categoryId: input.categoryId ?? current.categoryId,
      description: input.description ?? current.description,
      applications: input.applications ?? current.applications,
      status: input.status ?? current.status,
      customerVisible: input.customerVisible ?? current.customerVisible,
      sellerVisible: input.sellerVisible ?? current.sellerVisible,
      sortOrder: input.sortOrder ?? current.sortOrder,
    },
    actor,
    current,
  );
  assertUniqueCode(next.gradeCode, id);
  records[index] = next;
  return structuredClone(next);
}

export async function createGrade(input: GradeInput, actor = "Admin"): Promise<Grade> {
  await delay(280);
  return insertGrade(input, actor);
}

export async function updateGrade(id: string, input: Partial<GradeInput>, actor = "Admin"): Promise<Grade> {
  await delay(240);
  return patchGrade(id, input, actor);
}

export async function updateGradeStatus(id: string, status: GradeStatus, actor = "Admin"): Promise<Grade> {
  return updateGrade(id, { status }, actor);
}

export async function updateVisibility(
  id: string,
  visibility: { customerVisible?: boolean; sellerVisible?: boolean },
  actor = "Admin",
): Promise<Grade> {
  return updateGrade(id, visibility, actor);
}

export async function deleteGrade(id: string): Promise<void> {
  await delay(200);
  const current = records.find((item) => item.id === id);
  if (!current) throw new GradeServiceError("Grade not found.");
  const used =
    current.usage.marketplaceOffers +
    current.usage.purchaseRequests +
    current.usage.orders +
    current.usage.invoices +
    current.usage.shipments +
    current.usage.reports;
  if (used > 0) {
    throw new GradeServiceError("This grade is referenced by existing transactions and cannot be deleted.");
  }
  records = records.filter((item) => item.id !== id);
}

export async function bulkUpdateGrades(ids: string[], action: GradeBulkAction, actor = "Admin"): Promise<Grade[]> {
  await delay(260);
  const updated: Grade[] = [];
  for (const id of ids) {
    const current = records.find((item) => item.id === id);
    if (!current) continue;
    let patch: Partial<GradeInput> = {};
    if (action === "ACTIVATE") patch = { status: "ACTIVE" };
    if (action === "DEACTIVATE") patch = { status: "INACTIVE" };
    if (action === "CUSTOMER_VISIBLE") patch = { customerVisible: true };
    if (action === "CUSTOMER_HIDDEN") patch = { customerVisible: false };
    if (action === "SELLER_VISIBLE") patch = { sellerVisible: true };
    if (action === "SELLER_HIDDEN") patch = { sellerVisible: false };
    updated.push(patchGrade(id, patch, actor));
  }
  return updated;
}

export async function importGrades(inputs: GradeInput[], actor = "Admin"): Promise<Grade[]> {
  await delay(360);
  return inputs.map((input) => insertGrade(input, actor));
}

/**
 * Customer marketplace contract:
 * GET /api/grades?customerVisible=true&status=ACTIVE
 * Never includes seller identity.
 */
export async function getCustomerVisibleGrades(): Promise<GradePublicPayload[]> {
  await delay(180);
  return records
    .filter((item) => item.status === "ACTIVE" && item.customerVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.gradeName.localeCompare(b.gradeName))
    .map(toPublicGrade);
}

/**
 * Seller marketplace / offer-creation contract:
 * GET /api/grades?sellerVisible=true&status=ACTIVE
 * Sellers select from this controlled list rather than typing free-text grades.
 */
export async function getSellerVisibleGrades(): Promise<GradePublicPayload[]> {
  await delay(180);
  return records
    .filter((item) => item.status === "ACTIVE" && item.sellerVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.gradeName.localeCompare(b.gradeName))
    .map(toPublicGrade);
}

export async function exportGrades(grades: Grade[]): Promise<Grade[]> {
  await delay(80);
  return clone(grades);
}
