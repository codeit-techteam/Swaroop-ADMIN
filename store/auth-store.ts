"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEMO_CREDENTIALS } from "@/lib/constants";
import { permissionLabels } from "@/lib/permissions";
import { clearSessionCookie, hasSessionCookie, setSessionCookie } from "@/lib/session";
import type { AdminRole, AdminUser } from "@/types";

interface AuthState {
  user: AdminUser | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  demoLogin: (role?: AdminRole) => void;
  logout: () => void;
  setHydrated: () => void;
  finishHydration: () => void;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      login: async (email, password) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (
          email.toLowerCase() === DEMO_CREDENTIALS.email &&
          password === DEMO_CREDENTIALS.password
        ) {
          const user = demoUser("SUPER_ADMIN");
          setSessionCookie();
          set({ user, hydrated: true });
          return { ok: true };
        }
        return { ok: false, error: "Invalid corporate email or password." };
      },
      demoLogin: (role = "SUPER_ADMIN") => {
        const user = demoUser(role);
        setSessionCookie();
        set({ user, hydrated: true });
      },
      logout: () => {
        clearSessionCookie();
        set({ user: null, hydrated: true });
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
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
