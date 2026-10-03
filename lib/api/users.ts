import { apiRequest } from "@/lib/api/client";

export type DirectoryUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  loginId: string | null;
  role: string | null;
  roles: string[];
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  seller: {
    id: string;
    name: string | null;
    gst?: string | null;
    pan?: string | null;
    status?: string;
  } | null;
  isPrimary?: boolean;
};

export type UserListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sellerId?: string;
  from?: string;
  to?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type PermissionDef = {
  code: string;
  module: string;
  action: string;
  description?: string;
};

export type PermissionPreset = {
  id: string;
  label: string;
  permissions: string[];
};

export type PermissionCatalog = {
  role: string;
  permissions: PermissionDef[];
  presets: PermissionPreset[];
  defaultPreset?: string;
  assignableSellerStatuses: string[];
  invitationTtlHours: number;
};

export type SellerOption = {
  id: string;
  code?: string | null;
  name: string;
  legalName?: string | null;
  gst?: string | null;
  pan?: string | null;
  status?: string;
};

export type ManagerDetail = DirectoryUser & {
  mustChangePassword?: boolean;
  hasPassword?: boolean;
  permissions: string[];
  loginCount: number | null;
  seller: (SellerOption & { organizationStatus?: string }) | null;
  createdBy: { id: string; name: string } | null;
  pendingLink: { purpose: string; expiresAt: string; createdAt: string } | null;
  assignment: {
    id: string;
    status: string;
    isPrimary: boolean;
    title: string | null;
    assignedAt: string;
    deactivatedAt?: string | null;
  } | null;
  activity: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorName?: string | null;
    metadata?: unknown;
  }>;
};

export type OneTimeLink = {
  token: string;
  expiresAt: string;
  delivery: "MANUAL";
  message: string;
};

export type CreatedManager = {
  id: string;
  name: string;
  email: string;
  phone: string;
  loginId: string | null;
  role: string;
  status: string;
  seller: SellerOption;
  permissions: string[];
  isPrimary: boolean;
  accessMethod: "INVITATION" | "TEMPORARY_PASSWORD";
  invitation: (OneTimeLink & { email: string }) | null;
};

export function sellerSetupUrl(token: string) {
  const origin = process.env.NEXT_PUBLIC_SELLER_APP_URL ?? "http://localhost:3003";
  return `${origin.replace(/\/$/, "")}/accept-invite?token=${encodeURIComponent(token)}`;
}

function queryString(query: UserListQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export async function listUsers(query: UserListQuery) {
  return apiRequest<DirectoryUser[]>(`/admin/users${queryString(query)}`);
}

export async function exportUsers(query: UserListQuery) {
  return apiRequest<{ filename: string; csv: string }>(
    `/admin/users/export${queryString(query)}`,
  );
}

export async function getUser(id: string) {
  return apiRequest<ManagerDetail>(`/admin/users/${id}`);
}

export async function getPermissionCatalog() {
  return apiRequest<PermissionCatalog>("/admin/users/permission-catalog");
}

/** Server-side search, limited to sellers that can receive a manager. */
export async function searchSellers(
  search: string,
  status = "APPROVED",
  signal?: AbortSignal,
): Promise<SellerOption[]> {
  const params = new URLSearchParams({ limit: "10", page: "1", status });
  if (search.trim()) params.set("search", search.trim());
  const result = await apiRequest<
    Array<{
      id: string;
      status?: string;
      organization?: {
        code?: string | null;
        name?: string;
        legalName?: string | null;
        gstin?: string | null;
        pan?: string | null;
      };
    }>
  >(`/admin/sellers?${params.toString()}`, { signal });
  return result.data.map((row) => ({
    id: row.id,
    code: row.organization?.code ?? null,
    name: row.organization?.name ?? "Seller",
    legalName: row.organization?.legalName,
    gst: row.organization?.gstin,
    pan: row.organization?.pan,
    status: row.status,
  }));
}

export async function createManager(body: {
  name: string;
  email: string;
  phone: string;
  sellerId: string;
  role: "SELLER_MANAGER";
  permissions: string[];
  accessMethod: "INVITATION" | "TEMPORARY_PASSWORD";
  temporaryPassword?: string;
  isPrimary?: boolean;
  title?: string;
}) {
  return apiRequest<CreatedManager>("/admin/users/managers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateManager(
  id: string,
  body: Record<string, unknown>,
) {
  return apiRequest<ManagerDetail>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function resetManagerAccess(id: string) {
  return apiRequest<OneTimeLink & { purpose: "INVITATION" | "PASSWORD_RESET" }>(
    `/admin/users/${id}/reset-password`,
    { method: "POST" },
  );
}

export async function postUserAction(id: string, action: string) {
  return apiRequest<ManagerDetail>(
    `/admin/users/${id}/${action}`,
    { method: "POST" },
  );
}
