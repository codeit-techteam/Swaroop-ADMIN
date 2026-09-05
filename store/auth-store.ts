"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEMO_CREDENTIALS } from "@/lib/constants";
import { permissionLabels } from "@/lib/permissions";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";
import type { AdminRole, AdminUser } from "@/types";

interface AuthState {
  user: AdminUser | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  demoLogin: (role?: AdminRole) => void;
  logout: () => void;
  setHydrated: () => void;
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
    (set) => ({
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
          set({ user });
          return { ok: true };
        }
        return { ok: false, error: "Invalid corporate email or password." };
      },
      demoLogin: (role = "SUPER_ADMIN") => {
        const user = demoUser(role);
        setSessionCookie();
        set({ user });
      },
      logout: () => {
        clearSessionCookie();
        set({ user: null });
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "pt-admin-auth",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
        if (state?.user) setSessionCookie();
      },
    },
  ),
);
