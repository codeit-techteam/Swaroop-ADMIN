"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { API_BASE_URL, AUTH_REFRESH_KEY, AUTH_TOKEN_KEY } from "@/lib/env";
import { permissionLabels } from "@/lib/permissions";
import { clearSessionCookie, hasSessionCookie, setSessionCookie } from "@/lib/session";
import type { AdminRole, AdminUser } from "@/types";

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  setHydrated: () => void;
  finishHydration: () => void;
}

function persistTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  if (refreshToken) window.localStorage.setItem(AUTH_REFRESH_KEY, refreshToken);
}

function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_REFRESH_KEY);
}

function mapBackendUser(payload: {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[];
}): AdminUser {
  const roles = payload.roles ?? [];
  const role: AdminRole = roles.includes("SUPER_ADMIN")
    ? "SUPER_ADMIN"
    : roles.includes("ADMIN")
      ? "ADMIN"
      : "ADMIN";
  const name = [payload.firstName, payload.lastName].filter(Boolean).join(" ") || "Admin";
  return {
    id: payload.id,
    name,
    email: payload.email ?? "",
    phone: "+91 98765 00001",
    role,
    department: "Platform Control",
    lastLogin: new Date().toISOString(),
    permissions: permissionLabels(role),
  };
}

async function backendLogin(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? "Invalid corporate email or password.");
  }
  const data = payload?.data;
  if (!data?.accessToken || !data?.user) {
    throw new Error("Login response missing tokens. Check API base URL.");
  }
  return data as {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      roles?: string[];
    };
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      hydrated: false,
      login: async (email, password) => {
        try {
          const data = await backendLogin(email.trim().toLowerCase(), password);
          const roles = data.user.roles ?? [];
          if (!roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN")) {
            return { ok: false, error: "This account does not have admin access." };
          }
          persistTokens(data.accessToken, data.refreshToken);
          const user = mapBackendUser(data.user);
          setSessionCookie();
          set({ user, accessToken: data.accessToken, hydrated: true });
          return { ok: true };
        } catch (error) {
          if (error instanceof TypeError) {
            return {
              ok: false,
              error: "Unable to reach the server. Check your connection and try again.",
            };
          }
          return {
            ok: false,
            error: error instanceof Error ? error.message : "Invalid corporate email or password.",
          };
        }
      },
      logout: () => {
        clearSessionCookie();
        clearTokens();
        set({ user: null, accessToken: null, hydrated: true });
      },
      setHydrated: () => set({ hydrated: true }),
      finishHydration: () => {
        if (get().hydrated && get().user) return;
        if (!get().user && hasSessionCookie() && get().accessToken) {
          set({ hydrated: true });
          return;
        }
        if (!get().user) clearSessionCookie();
        set({ hydrated: true });
      },
    }),
    {
      name: "pt-admin-auth",
      skipHydration: true,
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) persistTokens(state.accessToken);
        if (state?.user && state?.accessToken) setSessionCookie();
      },
    },
  ),
);
