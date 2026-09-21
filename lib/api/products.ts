import { apiRequest } from "@/lib/api/client";
import type { ProductGrade } from "@/types";

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
  grade?: { code?: string; name?: string } | null;
  organization?: { name?: string | null } | null;
  inventory?: Array<{ availableQty?: number | string }>;
  offers?: Array<{ id: string }>;
};

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapAdminProduct(item: BackendProduct): ProductGrade {
  const inventory = item.inventory?.reduce((sum, row) => sum + num(row.availableQty), 0) ?? 0;
  return {
    id: item.id,
    grade: item.name,
    commodity: item.grade?.code ?? item.grade?.name ?? item.code,
    manufacturer: item.manufacturer ?? item.brand ?? item.organization?.name ?? "PRIVATE",
    brand: item.brand ?? "PRIVATE",
    specification: [item.mfi ? `MFI ${item.mfi}` : null, item.description].filter(Boolean).join(" · "),
    location: "Verified Hub",
    availableQty: inventory,
    activeSellers: item.organization ? 1 : 0,
    activeOffers: item.offers?.length ?? 0,
    inventory,
    status: item.status === "INACTIVE" || item.status === "ARCHIVED" ? "Inactive" : "Active",
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

export async function updateAdminProductStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const { data } = await apiRequest<BackendProduct>(`/admin/products/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return mapAdminProduct(data);
}
