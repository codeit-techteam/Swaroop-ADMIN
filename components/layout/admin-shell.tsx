"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminHeader } from "@/components/layout/header";
import { AdminSidebar } from "@/components/layout/sidebar";
import { GlobalSearch } from "@/components/layout/global-search";
import { QuickExport } from "@/components/layout/quick-export";
import { canAccessRoute } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace("/login");
    else if (!canAccessRoute(user.role, pathname)) router.replace("/dashboard");
  }, [hydrated, user, pathname, router]);

  if (!hydrated || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading PetroTrade OS…</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      <AdminSidebar />
      <div className={cn("flex min-w-0 flex-1 flex-col transition-[max-width] duration-200 ease-out", collapsed ? "lg:max-w-[calc(100%-72px)]" : "lg:max-w-[calc(100%-260px)]")}>
        <AdminHeader />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
      <GlobalSearch />
      <QuickExport />
    </div>
  );
}
