/**
 * Grade Master — single source of truth for tradable petrochemical grades.
 *
 * Hierarchy:
 *   Category (HDPE) → Grade (HD Film) → Seller Offer (price/qty/terms)
 *
 * Blind marketplace rule: Grade Master never carries seller identity.
 * Customer and Seller apps consume this catalog; they must not maintain
 * separate hardcoded grade lists.
 *
 * Future API contract:
 *   Customer: GET /api/grades?customerVisible=true&status=ACTIVE
 *   Seller:   GET /api/grades?sellerVisible=true&status=ACTIVE
 *
 * Suggested Supabase table: grades
 *   id UUID, grade_code TEXT UNIQUE, grade_name TEXT, category_id UUID,
 *   description TEXT, applications JSONB, status TEXT,
 *   customer_visible BOOLEAN, seller_visible BOOLEAN, sort_order INTEGER,
 *   created_at TIMESTAMP, updated_at TIMESTAMP, created_by UUID, updated_by UUID
 */

export type GradeStatus = "ACTIVE" | "INACTIVE";

export type GradeVisibilityFilter = "ALL" | "VISIBLE" | "HIDDEN";

export type GradeSortKey =
  | "gradeCode"
  | "gradeName"
  | "categoryName"
  | "status"
  | "createdAt"
  | "updatedAt";

/** Category Master precursor — grades belong to a category, not a free-text string. */
export interface GradeCategory {
  id: string;
  code: string;
  name: string;
  parentGroup: GradeParentGroup;
  description?: string;
}

export type GradeParentGroup =
  | "Polymers"
  | "Compounds"
  | "Masterbatch"
  | "Elastomers"
  | "Chemicals"
  | "Solvents"
  | "Intermediates"
  | "Recycled"
  | "Base Oils"
  | "Specialty";

export interface GradeUsage {
  marketplaceOffers: number;
  purchaseRequests: number;
  orders: number;
  invoices: number;
  shipments: number;
  reports: number;
}

export interface Grade {
  id: string;
  gradeCode: string;
  gradeName: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  applications: string[];
  status: GradeStatus;
  customerVisible: boolean;
  sellerVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  usage: GradeUsage;
}

export interface GradeInput {
  gradeCode: string;
  gradeName: string;
  categoryId: string;
  description?: string;
  applications: string[];
  status: GradeStatus;
  customerVisible: boolean;
  sellerVisible: boolean;
  sortOrder: number;
}

export interface GradeFilters {
  search: string;
  categoryId: string | "ALL";
  status: GradeStatus | "ALL";
  customerVisible: GradeVisibilityFilter;
  sellerVisible: GradeVisibilityFilter;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
}

export interface GradePagination {
  page: number;
  pageSize: number;
}

export interface GradeSort {
  key: GradeSortKey;
  dir: "asc" | "desc";
}

export interface GradeKpis {
  total: number;
  active: number;
  inactive: number;
  customerVisible: number;
  sellerVisible: number;
}

export interface GradeAuditEvent {
  id: string;
  action: string;
  gradeId: string;
  gradeCode: string;
  admin: string;
  timestamp: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

export type GradeBulkAction =
  | "ACTIVATE"
  | "DEACTIVATE"
  | "CUSTOMER_VISIBLE"
  | "CUSTOMER_HIDDEN"
  | "SELLER_VISIBLE"
  | "SELLER_HIDDEN";

export type GradeImportIssue =
  | "DUPLICATE_CODE"
  | "EXISTING_CODE"
  | "MISSING_CODE"
  | "MISSING_NAME"
  | "MISSING_CATEGORY"
  | "UNKNOWN_CATEGORY"
  | "INVALID_STATUS"
  | "INVALID_VISIBILITY"
  | "INVALID_SORT_ORDER";

export interface GradeImportRow {
  rowNumber: number;
  raw: Record<string, string>;
  parsed?: GradeInput;
  issues: GradeImportIssue[];
  action: "CREATE" | "SKIP";
}

export interface GradeImportPreview {
  rows: GradeImportRow[];
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
}

/**
 * Payload Customer / Seller apps may consume.
 * Seller identity is intentionally absent (blind marketplace).
 */
export interface GradePublicPayload {
  id: string;
  gradeCode: string;
  gradeName: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  applications: string[];
  sortOrder: number;
}

export interface GradeListQuery {
  search?: string;
  categoryId?: string;
  status?: GradeStatus;
  customerVisible?: boolean;
  sellerVisible?: boolean;
  sortBy?: GradeSortKey;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export const EMPTY_GRADE_FILTERS: GradeFilters = {
  search: "",
  categoryId: "ALL",
  status: "ALL",
  customerVisible: "ALL",
  sellerVisible: "ALL",
  createdFrom: "",
  createdTo: "",
  updatedFrom: "",
  updatedTo: "",
};

export const DEFAULT_GRADE_PAGINATION: GradePagination = {
  page: 0,
  pageSize: 25,
};

export const DEFAULT_GRADE_SORT: GradeSort = {
  key: "updatedAt",
  dir: "desc",
};

export const GRADE_PAGE_SIZES = [25, 50, 100] as const;

export const GRADE_IMPACT_SURFACES = [
  "Customer Marketplace",
  "Seller Marketplace",
  "Purchase Requests",
  "Orders",
  "Reports",
] as const;
