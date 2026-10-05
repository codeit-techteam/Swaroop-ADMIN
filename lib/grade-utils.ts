import type {
  Grade,
  GradeAuditEvent,
  GradeCategory,
  GradeFilters,
  GradeInput,
  GradeStatus,
  GradeUsage,
} from "@/types/grade";

let liveCategories: GradeCategory[] = [];

export function setCategoryCache(categories: GradeCategory[]) {
  if (categories.length) liveCategories = categories;
}

export function getLiveCategories(): GradeCategory[] {
  return liveCategories;
}

export const STATUS_LABELS: Record<GradeStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

export function usageCount(usage: GradeUsage) {
  return (
    usage.marketplaceOffers +
    usage.purchaseRequests +
    usage.orders +
    usage.invoices +
    usage.shipments +
    usage.reports
  );
}

export function emptyUsage(): GradeUsage {
  return {
    marketplaceOffers: 0,
    purchaseRequests: 0,
    orders: 0,
    invoices: 0,
    shipments: 0,
    reports: 0,
  };
}

export function normalizeGradeCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_%]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function categoryById(categoryId: string) {
  return liveCategories.find((item) => item.id === categoryId);
}

export function filtersAreActive(filters: GradeFilters) {
  return Boolean(
    filters.search.trim() ||
      filters.categoryId !== "ALL" ||
      filters.status !== "ALL" ||
      filters.customerVisible !== "ALL" ||
      filters.sellerVisible !== "ALL" ||
      filters.gradeGroup !== "ALL" ||
      filters.manufacturer !== "ALL" ||
      filters.inTodaysDelhiPriceList !== "ALL",
  );
}

/** "₹112.50" for Decimal strings from the API, "—" when Source.One has no price. */
export function formatRsKg(value: string | null) {
  return value == null ? "—" : `₹${value}`;
}

export function emptyGradeInput(): GradeInput {
  return {
    gradeCode: "",
    gradeName: "",
    categoryId: "",
    description: "",
    applications: [],
    status: "ACTIVE",
    customerVisible: true,
    sellerVisible: true,
    sortOrder: 10,
  };
}

export function gradeToInput(grade: Grade): GradeInput {
  return {
    gradeCode: grade.gradeCode,
    gradeName: grade.gradeName,
    categoryId: grade.categoryId,
    description: grade.description ?? "",
    applications: [...grade.applications],
    status: grade.status,
    customerVisible: grade.customerVisible,
    sellerVisible: grade.sellerVisible,
    sortOrder: grade.sortOrder,
  };
}

export interface GradeFormErrors {
  gradeCode?: string;
  gradeName?: string;
  categoryId?: string;
  sortOrder?: string;
}

export function validateGradeInput(input: GradeInput): GradeFormErrors {
  const errors: GradeFormErrors = {};
  if (!input.gradeCode.trim()) errors.gradeCode = "Grade code is required.";
  if (!input.gradeName.trim()) errors.gradeName = "Grade name is required.";
  if (!input.categoryId) errors.categoryId = "Category is required.";
  if (!Number.isFinite(input.sortOrder) || input.sortOrder < 0) {
    errors.sortOrder = "Sort order must be 0 or greater.";
  }
  return errors;
}

export function parseApplications(value: string) {
  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function gradeExportRows(grades: Grade[]) {
  return grades.map((item) => ({
    gradeCode: item.gradeCode,
    gradeName: item.gradeName,
    category: item.categoryName,
    gradeGroup: item.gradeGroup ?? "",
    gradeNo: item.gradeNo ?? "",
    manufacturer: item.manufacturer ?? "",
    inTodaysDelhiPriceList: item.inTodaysDelhiPriceList,
    priceTodayRsKg: item.priceTodayRsKg ?? "",
    producerPriceRsKg: item.producerPriceRsKg ?? "",
    producerPriceType: item.producerPriceType ?? "",
    source: item.source ?? "",
    description: item.description ?? "",
    applications: item.applications.join(","),
    status: item.status,
    customerVisible: item.customerVisible,
    sellerVisible: item.sellerVisible,
    sortOrder: item.sortOrder,
    updatedAt: item.updatedAt,
  }));
}

export function diffGradeFields(before: Grade, after: Grade): Array<Pick<GradeAuditEvent, "field" | "oldValue" | "newValue">> {
  const pairs: Array<[string, string, string]> = [
    ["Grade Name", before.gradeName, after.gradeName],
    ["Grade Code", before.gradeCode, after.gradeCode],
    ["Category", before.categoryName, after.categoryName],
    ["Description", before.description ?? "", after.description ?? ""],
    ["Applications", before.applications.join(", "), after.applications.join(", ")],
    ["Status", before.status, after.status],
    ["Customer Visible", before.customerVisible ? "YES" : "NO", after.customerVisible ? "YES" : "NO"],
    ["Seller Visible", before.sellerVisible ? "YES" : "NO", after.sellerVisible ? "YES" : "NO"],
    ["Sort Order", String(before.sortOrder), String(after.sortOrder)],
  ];
  return pairs
    .filter(([, oldValue, newValue]) => oldValue !== newValue)
    .map(([field, oldValue, newValue]) => ({ field, oldValue, newValue }));
}

export function yesNo(value: boolean) {
  return value ? "YES" : "NO";
}
