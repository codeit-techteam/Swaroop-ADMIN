import type { AdminRole } from "@/types";

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  OPERATIONS: "Operations",
  PROCUREMENT: "Procurement",
  FINANCE: "Finance",
  COMPLIANCE: "Compliance",
  SUPPORT: "Support",
};

const ALL_ROUTES = [
  "/dashboard",
  "/procurement",
  "/customers",
  "/sellers",
  "/users",
  "/kyc",
  "/catalog",
  "/orders",
  "/offers",
  "/payments",
  "/credit-insurance",
  "/receivables",
  "/logistics",
  "/disputes",
  "/analytics",
  "/content",
  "/notifications",
  "/documents",
  "/audit-logs",
  "/profile",
  "/settings",
] as const;

type RoutePrefix = (typeof ALL_ROUTES)[number];

const ROLE_ACCESS: Record<AdminRole, RoutePrefix[]> = {
  SUPER_ADMIN: [...ALL_ROUTES],
  ADMIN: ALL_ROUTES.filter((route) => route !== "/settings") as RoutePrefix[],
  OPERATIONS: [
    "/dashboard",
    "/procurement",
    "/orders",
    "/logistics",
    "/disputes",
    "/notifications",
    "/profile",
  ],
  PROCUREMENT: [
    "/dashboard",
    "/procurement",
    "/sellers",
    "/offers",
    "/catalog",
    "/notifications",
    "/profile",
  ],
  FINANCE: [
    "/dashboard",
    "/payments",
    "/receivables",
    "/credit-insurance",
    "/orders",
    "/notifications",
    "/profile",
  ],
  COMPLIANCE: [
    "/dashboard",
    "/kyc",
    "/documents",
    "/disputes",
    "/audit-logs",
    "/notifications",
    "/profile",
  ],
  SUPPORT: ["/dashboard", "/customers", "/users", "/disputes", "/notifications", "/profile"],
};

export function canAccessRoute(role: AdminRole, pathname: string) {
  const allowed = ROLE_ACCESS[role];
  return allowed.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function permissionLabels(role: AdminRole) {
  const map: Record<AdminRole, string[]> = {
    SUPER_ADMIN: ["Full platform control", "User & role administration", "Finance overrides", "Audit access", "Content management"],
    ADMIN: ["Operational control", "KYC & offers review", "Order management", "Analytics"],
    OPERATIONS: ["Orders", "Procurement", "Logistics", "Disputes"],
    PROCUREMENT: ["Procurement workbench", "Sellers", "Offers", "Catalog"],
    FINANCE: ["Payments", "Receivables", "Credit insurance"],
    COMPLIANCE: ["KYC", "Documents", "Disputes", "Audit logs"],
    SUPPORT: ["Customers", "Users", "Disputes"],
  };
  return map[role];
}
