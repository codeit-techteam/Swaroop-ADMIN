import { API_BASE_URL, AUTH_REFRESH_KEY, AUTH_TOKEN_KEY } from "@/lib/env";

/** Dispatched when the refresh token is rejected and the admin must sign in again. */
export const SESSION_EXPIRED_EVENT = "pt-admin-session-expired";
/** Dispatched after a silent refresh so in-memory state can pick up the new access token. */
export const TOKENS_ROTATED_EVENT = "pt-admin-tokens-rotated";

const REFRESH_LOCK_NAME = "pt-admin-token-refresh";
const EXPIRY_SKEW_MS = 30_000;

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(key);
  return value && value.trim() ? value.trim() : null;
}

export function getAccessToken() {
  return read(AUTH_TOKEN_KEY);
}

export function getRefreshToken() {
  return read(AUTH_REFRESH_KEY);
}

export function persistTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  if (refreshToken) window.localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_REFRESH_KEY);
}

function jwtExpiryMs(token: string): number | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const payload = JSON.parse(atob(segment.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: unknown;
    };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isAccessTokenExpiring(token: string | null, skewMs = EXPIRY_SKEW_MS) {
  if (!token) return true;
  const exp = jwtExpiryMs(token);
  if (exp == null) return false;
  return Date.now() >= exp - skewMs;
}

/** Serialize refreshes across tabs: the backend revokes the session family on refresh-token reuse. */
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK_NAME, fn);
  }
  return fn();
}

type RefreshOutcome = { token: string } | { expired: true } | { transient: true };

async function performRefresh(staleRefreshToken: string | null): Promise<RefreshOutcome> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return { expired: true };

  // Another tab rotated while we waited for the lock.
  if (staleRefreshToken && refreshToken !== staleRefreshToken) {
    const access = getAccessToken();
    if (access && !isAccessTokenExpiring(access, 0)) return { token: access };
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return { transient: true };
  }

  if (response.status >= 500) return { transient: true };
  const payload = (await response.json().catch(() => null)) as {
    data?: { accessToken?: string; refreshToken?: string };
  } | null;
  const accessToken = payload?.data?.accessToken;
  if (!response.ok || !accessToken) return { expired: true };

  persistTokens(accessToken, payload?.data?.refreshToken);
  window.dispatchEvent(new CustomEvent(TOKENS_ROTATED_EVENT, { detail: accessToken }));
  return { token: accessToken };
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchange the refresh token for a new access token. Returns null when the
 * session can't be renewed; a rejected refresh token also fires SESSION_EXPIRED_EVENT.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const staleRefreshToken = getRefreshToken();
  refreshInFlight = withRefreshLock(() => performRefresh(staleRefreshToken))
    .then((outcome) => {
      if ("token" in outcome) return outcome.token;
      if ("expired" in outcome) {
        clearTokens();
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
      return null;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/** Access token that is valid for at least the next few seconds, refreshing first if needed. */
export async function getFreshAccessToken(): Promise<string | null> {
  const current = getAccessToken();
  if (current && !isAccessTokenExpiring(current)) return current;
  if (!getRefreshToken()) return current;
  return (await refreshAccessToken()) ?? current;
}
