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
};

export type PermissionPreset = {
  id: string;
  label: string;
  permissions: string[];
};

export type SellerOption = {
  id: string;
  name: string;
  legalName?: string | null;
  gst?: string | null;
  pan?: string | null;
  status?: string;
};

export type ManagerDetail = DirectoryUser & {
  mustChangePassword?: boolean;
  permissions: string[];
  loginCount: number | null;
  assignment: {
    id: string;
    status: string;
    isPrimary: boolean;
    title: string | null;
    assignedAt: string;
  } | null;
  activity: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata?: unknown;
  }>;
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
  accessMethod: string;
  invitation: {
    token: string;
    expiresAt: string;
    email: string;
    message: string;
  } | null;
  temporaryPassword?: string;
};

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
  return apiRequest<{
    permissions: PermissionDef[];
    presets: PermissionPreset[];
  }>("/admin/users/permission-catalog");
}

export async function searchSellers(search: string) {
  const params = new URLSearchParams({ limit: "8", page: "1" });
  if (search.trim()) params.set("search", search.trim());
  const result = await apiRequest<
    Array<{
      id: string;
      status?: string;
      organization?: {
        name?: string;
        legalName?: string | null;
        gstin?: string | null;
        pan?: string | null;
      };
    }>
  >(`/admin/sellers?${params.toString()}`);
  return result.data.map((row) => ({
    id: row.id,
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

export async function postUserAction(id: string, action: string) {
  return apiRequest<ManagerDetail & { token?: string; message?: string }>(
    `/admin/users/${id}/${action}`,
    { method: "POST" },
  );
}
