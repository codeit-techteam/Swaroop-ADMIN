import {
  getAccessToken,
  getFreshAccessToken,
  getRefreshToken,
  isAccessTokenExpiring,
  refreshAccessToken,
} from "@/lib/auth-tokens";
import { API_BASE_URL } from "@/lib/env";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function send(path: string, init: RequestInit, access: string | null) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  // FormData needs the browser-generated multipart boundary header.
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (access) headers.set("Authorization", `Bearer ${access}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta?: ApiEnvelope<T>["meta"] }> {
  const access = await getFreshAccessToken();
  let response = await send(path, init, access);

  if (response.status === 401 && getRefreshToken()) {
    const latest = getAccessToken();
    const renewed =
      latest && latest !== access && !isAccessTokenExpiring(latest, 0)
        ? latest
        : await refreshAccessToken();
    if (renewed) response = await send(path, init, renewed);
  }
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string | string[]; code?: string; details?: unknown }
    | null;

  if (!response.ok) {
    const error = (payload ?? {}) as {
      message?: string | string[];
      code?: string;
      details?: unknown;
    };
    const message = Array.isArray(error.message)
      ? error.message.join(". ")
      : error.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, error.code, error.details);
  }

  const envelope = payload as ApiEnvelope<T>;
  return { data: envelope.data, meta: envelope.meta };
}
