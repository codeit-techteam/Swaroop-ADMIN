"use client";

import { Download, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { NotificationMenu } from "@/components/layout/notification-menu";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

export function AdminHeader() {
  const user = useAuthStore((s) => s.user);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const initials = useMemo(
    () =>
      (user?.name ?? "A")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [user?.name],
  );

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-white px-4">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="size-4" />
      </Button>
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-slate-50 px-3 text-left text-sm text-muted-foreground hover:bg-slate-100"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search orders, clients, sellers, shipments...</span>
        <kbd className="ml-auto hidden rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>
      <Button type="button" variant="outline" size="sm" onClick={() => setExportOpen(true)}>
        <Download className="size-3.5" />
        Quick Export
      </Button>
      <NotificationMenu />
      <Link href="/profile" className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50">
        <span className="flex size-8 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white">
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-semibold leading-tight">{user?.name ?? "Admin"}</span>
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
            {user ? ROLE_LABELS[user.role] : "Guest"}
          </span>
        </span>
      </Link>
    </header>
  );
}
