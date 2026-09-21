    "use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEMO_CREDENTIALS } from "@/lib/constants";
import { API_BASE_URL, AUTH_REFRESH_KEY, AUTH_TOKEN_KEY } from "@/lib/env";
import { permissionLabels } from "@/lib/permissions";
import { clearSessionCookie, hasSessionCookie, setSessionCookie } from "@/lib/session";
import type { AdminRole, AdminUser } from "@/types";

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  demoLogin: (role?: AdminRole) => Promise<void> | void;
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

const demoUser = (role: AdminRole = "SUPER_ADMIN"): AdminUser => ({
  id: "USR-1001",
  name: role === "SUPER_ADMIN" ? "Admin" : role.replaceAll("_", " "),
  email: DEMO_CREDENTIALS.email,
  phone: "+91 98765 00001",
  role,
  department: "Platform Control",
  lastLogin: new Date().toISOString(),
  permissions: permissionLabels(role),
});

function mapBackendUser(payload: {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  roles?: string[];
}): AdminUser {
  const role = (payload.roles?.[0] as AdminRole | undefined) ?? "ADMIN";
  const name = [payload.firstName, payload.lastName].filter(Boolean).join(" ") || "Admin";
  return {
    id: payload.id,
    name,
    email: payload.email ?? DEMO_CREDENTIALS.email,
    phone: "+91 98765 00001",
    role: role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN",
    department: "Platform Control",
    lastLogin: new Date().toISOString(),
    permissions: permissionLabels(role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"),
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
  return payload.data as {
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
        const attempts: Array<[string, string]> = [[email.trim().toLowerCase(), password]];
        if (
          email.toLowerCase() === "admin@petrotrade.com" &&
          (password === "Admin@123" || password === DEMO_CREDENTIALS.password)
        ) {
          attempts.push([DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password]);
        }
        for (const [tryEmail, tryPassword] of attempts) {
          try {
            const data = await backendLogin(tryEmail, tryPassword);
            persistTokens(data.accessToken, data.refreshToken);
            const user = mapBackendUser(data.user);
            setSessionCookie();
            set({ user, accessToken: data.accessToken, hydrated: true });
            return { ok: true };
          } catch {
            continue;
          }
        }
        return { ok: false, error: "Invalid corporate email or password." };
      },
      demoLogin: async () => {
        const result = await get().login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
        if (!result.ok) {
          const user = demoUser("SUPER_ADMIN");
          setSessionCookie();
          set({ user, hydrated: true });
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
        if (!get().user && hasSessionCookie()) {
          set({ user: demoUser("SUPER_ADMIN"), hydrated: true });
          setSessionCookie();
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
      },
    },
  ),
);
