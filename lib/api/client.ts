import { API_BASE_URL, AUTH_TOKEN_KEY } from "@/lib/env";

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
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function token() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T; meta?: ApiEnvelope<T>["meta"] }> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const access = token();
  if (access) headers.set("Authorization", `Bearer ${access}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && "message" in payload && payload.message
        ? payload.message
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  const envelope = payload as ApiEnvelope<T>;
  return { data: envelope.data, meta: envelope.meta };
}
