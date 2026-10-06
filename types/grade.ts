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

/** Sort keys accepted by GET /admin/grades (server-side sorting). */
export type GradeSortKey =
  | "gradeCode"
  | "gradeName"
  | "gradeNo"
  | "manufacturer"
  | "gradeGroup"
  | "sortOrder"
  | "createdAt"
  | "updatedAt";

export type GradeYesNoFilter = "ALL" | "YES" | "NO";

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
  /** Source.One identity and price fields; null for manually created grades. */
  gradeNo: string | null;
  gradeGroup: string | null;
  manufacturer: string | null;
  fullGradeName: string | null;
  inTodaysDelhiPriceList: boolean;
  priceTodayRsKg: string | null;
  producerPriceRsKg: string | null;
  producerPriceType: string | null;
  /** "SOURCE_ONE" for imported grades; their code and category are import-managed. */
  source: string | null;
  sourceReference: string | null;
  version: number;
  lastImportedAt: string | null;
}

export interface GradeStats {
  total: number;
  active: number;
  inactive: number;
  customerVisible: number;
  sellerVisible: number;
  inTodaysDelhiPriceList: number;
  sourceOne: number;
  categories: number;
  manufacturers: number;
  lastImport: {
    id: string;
    fileName: string;
    completedAt: string | null;
    insertedRows: number;
    updatedRows: number;
    totalRows: number;
  } | null;
}

export interface GradeFacetOption {
  name: string;
  gradeCount: number;
}

export interface GradeFacets {
  gradeGroups: GradeFacetOption[];
  manufacturers: GradeFacetOption[];
}

export interface GradeImportSummary {
  batchId: string | null;
  dryRun: boolean;
  fileName: string;
  fileSha256: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  /** Rows identical in every column to an earlier row. Missing on older backends. */
  exactDuplicateRows?: number;
  /** Rows sharing Category, Grade Group, Grade No. and Manufacturer with differing values. */
  keyMergedRows?: number;
  grades: number;
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  categoriesCreated: number;
  gradeGroupsCreated: number;
  notInFile: number;
}

export interface GradeImportBatch {
  id: string;
  source: string;
  fileName: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  trigger: string;
  totalRows: number;
  validRows: number;
  insertedRows: number;
  updatedRows: number;
  unchangedRows: number;
  skippedRows: number;
  duplicateRows: number;
  categoriesCreated: number;
  gradeGroupsCreated: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
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
  gradeGroup: string | "ALL";
  manufacturer: string | "ALL";
  inTodaysDelhiPriceList: GradeYesNoFilter;
}

export interface GradePagination {
  page: number;
  pageSize: number;
}

export interface GradeSort {
  key: GradeSortKey;
  dir: "asc" | "desc";
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

export const EMPTY_GRADE_FILTERS: GradeFilters = {
  search: "",
  categoryId: "ALL",
  status: "ALL",
  customerVisible: "ALL",
  sellerVisible: "ALL",
  gradeGroup: "ALL",
  manufacturer: "ALL",
  inTodaysDelhiPriceList: "ALL",
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
