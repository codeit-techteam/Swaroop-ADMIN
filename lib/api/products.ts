import { apiRequest } from "@/lib/api/client";
import type { ProductGrade } from "@/types";

export type AdminProductLifecycleStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "PAUSED"
  | "REJECTED"
  | "ARCHIVED";

type BackendProduct = {
  id: string;
  code: string;
  name: string;
  brand?: string | null;
  manufacturer?: string | null;
  description?: string | null;
  mfi?: string | null;
  unit?: string;
  status?: string;
  grade?: {
    id?: string;
    code?: string;
    name?: string;
    displayName?: string | null;
    manufacturer?: string | null;
  } | null;
  organization?: { id?: string; name?: string | null; code?: string | null } | null;
  inventory?: Array<{ availableQty?: number | string }>;
  offers?: Array<{ id: string; status?: string }>;
  _count?: { inventory?: number; offers?: number };
  inventoryAvailableQty?: number | string;
  activeOfferCount?: number | string;
};

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapProductStatus(status?: string): ProductGrade["status"] {
  if (!status) return "Inactive";
  if (status === "ACTIVE") return "Active";
  if (status === "PAUSED" || status === "ARCHIVED" || status === "INACTIVE") return "Inactive";
  if (status === "REJECTED") return "Suspended";
  return "Inactive";
}

export function mapAdminProduct(item: BackendProduct): ProductGrade {
  const inventoryFromRows =
    item.inventory?.reduce((sum, row) => sum + num(row.availableQty), 0) ?? 0;
  const inventory = inventoryFromRows > 0 ? inventoryFromRows : num(item.inventoryAvailableQty);
  const activeOffers =
    item.offers?.filter((offer) => !offer.status || offer.status === "ACTIVE").length ??
    num(item.activeOfferCount);

  return {
    id: item.id,
    productCode: item.code,
    gradeId: item.grade?.id,
    grade: item.name,
    commodity: item.grade?.code ?? item.grade?.name ?? item.code,
    manufacturer:
      item.grade?.manufacturer ??
      item.manufacturer ??
      item.brand ??
      "PRIVATE",
    brand: item.brand ?? "PRIVATE",
    specification: [item.mfi ? `MFI ${item.mfi}` : null, item.description]
      .filter(Boolean)
      .join(" · "),
    location: "Verified Hub",
    sellerName: item.organization?.name?.trim() || item.organization?.code || "Unknown seller",
    availableQty: inventory,
    activeSellers: item.organization ? 1 : 0,
    activeOffers,
    inventory,
    status: mapProductStatus(item.status),
    productStatus: item.status,
  };
}

export async function listAdminProducts(): Promise<ProductGrade[]> {
  const pages: ProductGrade[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const { data, meta } = await apiRequest<BackendProduct[]>(
      `/admin/products?page=${page}&limit=100&sortBy=createdAt&sortOrder=desc`,
    );
    pages.push(...(data ?? []).map(mapAdminProduct));
    totalPages = meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 10);
  return pages;
}

/**
 * ProductStatus (not GradeStatus). Deactivate → PAUSED so listings can be reactivated
 * without soft-deleting order/cart history. Never send GradeStatus.INACTIVE.
 */
export async function updateAdminProductStatus(
  id: string,
  status: Extract<AdminProductLifecycleStatus, "ACTIVE" | "PAUSED" | "ARCHIVED">,
) {
  const { data } = await apiRequest<BackendProduct>(`/admin/products/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return mapAdminProduct(data);
}
