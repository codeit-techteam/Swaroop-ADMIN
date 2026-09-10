import { GRADE_CATEGORIES } from "@/lib/mock-data/grades";
import type {
  Grade,
  GradeAuditEvent,
  GradeFilters,
  GradeImportIssue,
  GradeImportPreview,
  GradeImportRow,
  GradeInput,
  GradeKpis,
  GradePublicPayload,
  GradeSort,
  GradeStatus,
  GradeUsage,
} from "@/types/grade";

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
  return GRADE_CATEGORIES.find((item) => item.id === categoryId);
}

export function categoryByCode(code: string) {
  const normalized = normalizeGradeCode(code);
  return GRADE_CATEGORIES.find(
    (item) =>
      normalizeGradeCode(item.code) === normalized ||
      normalizeGradeCode(item.name) === normalized,
  );
}

export function gradeKpis(grades: Grade[]): GradeKpis {
  return {
    total: grades.length,
    active: grades.filter((item) => item.status === "ACTIVE").length,
    inactive: grades.filter((item) => item.status === "INACTIVE").length,
    customerVisible: grades.filter((item) => item.customerVisible).length,
    sellerVisible: grades.filter((item) => item.sellerVisible).length,
  };
}

export function matchesGradeFilters(grade: Grade, filters: GradeFilters) {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      grade.id,
      grade.gradeCode,
      grade.gradeName,
      grade.categoryName,
      grade.description ?? "",
      grade.applications.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (filters.categoryId !== "ALL" && grade.categoryId !== filters.categoryId) return false;
  if (filters.status !== "ALL" && grade.status !== filters.status) return false;
  if (filters.customerVisible === "VISIBLE" && !grade.customerVisible) return false;
  if (filters.customerVisible === "HIDDEN" && grade.customerVisible) return false;
  if (filters.sellerVisible === "VISIBLE" && !grade.sellerVisible) return false;
  if (filters.sellerVisible === "HIDDEN" && grade.sellerVisible) return false;
  if (!inDateRange(grade.createdAt, filters.createdFrom, filters.createdTo)) return false;
  if (!inDateRange(grade.updatedAt, filters.updatedFrom, filters.updatedTo)) return false;
  return true;
}

function inDateRange(iso: string, from: string, to: string) {
  if (!from && !to) return true;
  const day = iso.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function sortGrades(grades: Grade[], sort: GradeSort) {
  const copy = [...grades];
  copy.sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
    if (av < bv) return sort.dir === "asc" ? -1 : 1;
    if (av > bv) return sort.dir === "asc" ? 1 : -1;
    return a.gradeCode.localeCompare(b.gradeCode);
  });
  return copy;
}

function sortValue(grade: Grade, key: GradeSort["key"]): string | number {
  switch (key) {
    case "gradeCode":
      return grade.gradeCode;
    case "gradeName":
      return grade.gradeName.toLowerCase();
    case "categoryName":
      return grade.categoryName.toLowerCase();
    case "status":
      return grade.status;
    case "createdAt":
      return grade.createdAt;
    case "updatedAt":
      return grade.updatedAt;
    default:
      return grade.updatedAt;
  }
}

export function filtersAreActive(filters: GradeFilters) {
  return Boolean(
    filters.search.trim() ||
      filters.categoryId !== "ALL" ||
      filters.status !== "ALL" ||
      filters.customerVisible !== "ALL" ||
      filters.sellerVisible !== "ALL" ||
      filters.createdFrom ||
      filters.createdTo ||
      filters.updatedFrom ||
      filters.updatedTo,
  );
}

export function toPublicGrade(grade: Grade): GradePublicPayload {
  return {
    id: grade.id,
    gradeCode: grade.gradeCode,
    gradeName: grade.gradeName,
    categoryId: grade.categoryId,
    categoryName: grade.categoryName,
    description: grade.description,
    applications: [...grade.applications],
    sortOrder: grade.sortOrder,
  };
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
  if (!normalizeGradeCode(input.gradeCode)) errors.gradeCode = "Grade code is required.";
  if (!input.gradeName.trim()) errors.gradeName = "Grade name is required.";
  if (!input.categoryId) errors.categoryId = "Category is required.";
  if (!Number.isFinite(input.sortOrder) || input.sortOrder < 0) {
    errors.sortOrder = "Sort order must be 0 or greater.";
  }
  return errors;
}

export function parseBoolean(value: string): boolean | null {
  const v = value.trim().toLowerCase();
  if (["true", "yes", "y", "1", "on"].includes(v)) return true;
  if (["false", "no", "n", "0", "off"].includes(v)) return false;
  return null;
}

export function parseStatus(value: string): GradeStatus | null {
  const v = value.trim().toUpperCase();
  if (v === "ACTIVE" || v === "INACTIVE") return v;
  if (v === "TRUE" || v === "YES") return "ACTIVE";
  if (v === "FALSE" || v === "NO") return "INACTIVE";
  return null;
}

export function parseApplications(value: string) {
  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  const header = rows[0];
  if (!header) return [];
  const keys = header.map((item) => item.trim());
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    keys.forEach((key, index) => {
      record[key] = cells[index] ?? "";
    });
    return record;
  });
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i] ?? "";
    const next = source[i + 1] ?? "";
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
}

function cell(record: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const match = Object.keys(record).find((item) => item.trim().toLowerCase() === key.toLowerCase());
    if (match) return record[match] ?? "";
  }
  return "";
}

export function buildImportPreview(records: Record<string, string>[], existing: Grade[]): GradeImportPreview {
  const existingCodes = new Set(existing.map((item) => item.gradeCode));
  const seenInFile = new Map<string, number>();
  const rows: GradeImportRow[] = records.map((raw, index) => {
    const issues: GradeImportIssue[] = [];
    const gradeCode = normalizeGradeCode(cell(raw, "gradeCode", "grade_code", "code"));
    const gradeName = cell(raw, "gradeName", "grade_name", "name").trim();
    const categoryRaw = cell(raw, "category", "categoryCode", "category_id");
    const description = cell(raw, "description").trim();
    const applications = parseApplications(cell(raw, "applications"));
    const statusRaw = cell(raw, "status") || "ACTIVE";
    const customerRaw = cell(raw, "customerVisible", "customer_visible") || "true";
    const sellerRaw = cell(raw, "sellerVisible", "seller_visible") || "true";
    const sortRaw = cell(raw, "sortOrder", "sort_order") || "10";

    if (!gradeCode) issues.push("MISSING_CODE");
    if (!gradeName) issues.push("MISSING_NAME");

    const category =
      categoryById(categoryRaw) ??
      categoryByCode(categoryRaw) ??
      GRADE_CATEGORIES.find((item) => item.name.toLowerCase() === categoryRaw.trim().toLowerCase());
    if (!categoryRaw.trim()) issues.push("MISSING_CATEGORY");
    else if (!category) issues.push("UNKNOWN_CATEGORY");

    const status = parseStatus(statusRaw);
    if (statusRaw.trim() && !status) issues.push("INVALID_STATUS");
    const customerVisible = parseBoolean(customerRaw);
    const sellerVisible = parseBoolean(sellerRaw);
    if (customerRaw.trim() && customerVisible == null) issues.push("INVALID_VISIBILITY");
    if (sellerRaw.trim() && sellerVisible == null) issues.push("INVALID_VISIBILITY");
    const sortOrder = Number(sortRaw);
    if (sortRaw.trim() && !Number.isFinite(sortOrder)) issues.push("INVALID_SORT_ORDER");

    if (gradeCode && existingCodes.has(gradeCode)) issues.push("EXISTING_CODE");
    if (gradeCode) {
      const prior = seenInFile.get(gradeCode);
      if (prior != null) issues.push("DUPLICATE_CODE");
      else seenInFile.set(gradeCode, index + 2);
    }

    const parsed: GradeInput | undefined =
      issues.length === 0 && category && status && customerVisible != null && sellerVisible != null
        ? {
            gradeCode,
            gradeName,
            categoryId: category.id,
            description,
            applications,
            status,
            customerVisible,
            sellerVisible,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 10,
          }
        : undefined;

    return {
      rowNumber: index + 2,
      raw,
      parsed,
      issues,
      action: parsed ? "CREATE" : "SKIP",
    };
  });

  return {
    rows,
    validCount: rows.filter((row) => row.action === "CREATE").length,
    invalidCount: rows.filter((row) => row.issues.length > 0 && !row.issues.includes("DUPLICATE_CODE") && !row.issues.includes("EXISTING_CODE")).length,
    duplicateCount: rows.filter((row) => row.issues.includes("DUPLICATE_CODE") || row.issues.includes("EXISTING_CODE")).length,
  };
}

export const IMPORT_ISSUE_LABELS: Record<GradeImportIssue, string> = {
  DUPLICATE_CODE: "Duplicate grade code in file",
  EXISTING_CODE: "Grade code already exists",
  MISSING_CODE: "Missing grade code",
  MISSING_NAME: "Missing grade name",
  MISSING_CATEGORY: "Missing category",
  UNKNOWN_CATEGORY: "Unknown category",
  INVALID_STATUS: "Invalid status",
  INVALID_VISIBILITY: "Invalid visibility value",
  INVALID_SORT_ORDER: "Invalid sort order",
};

export function gradeExportRows(grades: Grade[]) {
  return grades.map((item) => ({
    gradeCode: item.gradeCode,
    gradeName: item.gradeName,
    category: item.categoryName,
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
