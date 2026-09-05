"use client";

import {
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APP_NAME, PORTAL_LABEL } from "@/lib/constants";
import { adminNav, isNavActive } from "@/lib/nav";
import { canAccessRoute, ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
        active
          ? "bg-white/12 text-white shadow-[inset_3px_0_0_0_#3B82F6]"
          : "text-white/70 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors",
          active ? "text-sky-300" : "text-white/55 group-hover:text-white/90",
        )}
      />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="border-navy bg-navy text-white">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const initials =
    (user?.name ?? "A")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  const content = (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-[#0B1220] text-white">
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-white/10",
            collapsed ? "justify-center px-2" : "gap-3 px-4",
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#2563EB] text-[11px] font-bold tracking-wide shadow-sm">
            PT
          </div>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold leading-tight tracking-tight">
                {APP_NAME}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/80">
                {PORTAL_LABEL}
              </p>
            </div>
          ) : null}
          {!collapsed ? (
            <button
              type="button"
              className="hidden size-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white lg:inline-flex"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="size-4" />
            </button>
          ) : null}
          {mobileOpen ? (
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {collapsed ? (
          <div className="hidden shrink-0 justify-center border-b border-white/10 py-2 lg:flex">
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/10 hover:text-white"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="size-4" />
            </button>
          </div>
        ) : null}

        <nav className="admin-sidebar-scroll flex-1 overflow-y-auto px-2.5 py-3">
          {adminNav.map((section, sectionIndex) => {
            const items = section.items.filter((item) =>
              user ? canAccessRoute(user.role, item.href) : true,
            );
            if (items.length === 0) return null;
            return (
              <div
                key={section.label}
                className={cn(sectionIndex > 0 && "mt-4")}
              >
                {collapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-white/10" aria-hidden />
                ) : (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    {section.label}
                  </p>
                )}
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                      active={isNavActive(pathname, item.href)}
                      collapsed={collapsed}
                      onNavigate={() => setMobileNavOpen(false)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-2.5">
          {!collapsed && user ? (
            <Link
              href="/profile"
              onClick={() => setMobileNavOpen(false)}
              className="mb-2 flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 transition hover:bg-white/[0.08]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1E3A5F] text-[11px] font-semibold text-sky-200">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">
                  {user.name}
                </span>
                <span className="block truncate text-[10px] uppercase tracking-wide text-white/45">
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
              <UserRound className="size-3.5 shrink-0 text-white/40" />
            </Link>
          ) : null}

          {collapsed ? (
            <div className="mb-1 flex flex-col gap-0.5">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href="/profile"
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex items-center justify-center rounded-md py-2.5 transition",
                      pathname.startsWith("/profile")
                        ? "bg-white/12 text-white"
                        : "text-white/70 hover:bg-white/8 hover:text-white",
                    )}
                    aria-label="Profile"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-[#1E3A5F] text-[10px] font-semibold text-sky-200">
                      {initials}
                    </span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="border-navy bg-navy text-white">
                  Profile
                </TooltipContent>
              </Tooltip>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-md text-[13px] font-medium text-white/65 transition hover:bg-red-500/15 hover:text-red-200",
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
            )}
            aria-label="Logout"
          >
            <LogOut className="size-[18px] shrink-0" />
            {!collapsed ? <span>Logout</span> : null}
          </button>
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 overflow-hidden transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        {content}
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative h-full w-[280px] shadow-2xl">{content}</div>
        </div>
      ) : null}
    </>
  );
}
