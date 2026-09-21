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
  "/master-data",
  "/orders",
  "/offers",
  "/payments",
  "/credit",
  "/credit-insurance",
  "/receivables",
  "/logistics",
  "/disputes",
  "/analytics",
  "/content",
  "/notifications",
  "/documents",
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
    "/master-data",
    "/notifications",
    "/profile",
  ],
  PROCUREMENT: [
    "/dashboard",
    "/procurement",
    "/sellers",
    "/offers",
    "/catalog",
    "/master-data",
    "/notifications",
    "/profile",
  ],
  FINANCE: [
    "/dashboard",
    "/payments",
    "/receivables",
    "/credit",
    "/credit-insurance",
    "/master-data",
    "/orders",
    "/notifications",
    "/profile",
  ],
  COMPLIANCE: [
    "/dashboard",
    "/kyc",
    "/documents",
    "/disputes",
    "/master-data",
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
    SUPER_ADMIN: ["Full platform control", "User & role administration", "Grade Master", "Finance overrides", "Content management", "Push notifications"],
    ADMIN: ["Operational control", "Grade Master", "KYC & offers review", "Order management", "Analytics", "Push notifications"],
    OPERATIONS: ["Orders", "Procurement", "Logistics", "Disputes", "Grade Master (view)"],
    PROCUREMENT: ["Procurement workbench", "Sellers", "Offers", "Catalog", "Grade Master"],
    FINANCE: ["Payments", "Receivables", "Credit Management", "Grade Master (view)"],
    COMPLIANCE: ["KYC", "Documents", "Disputes", "Grade Master (view)"],
    SUPPORT: ["Customers", "Users", "Disputes"],
  };
  return map[role];
}
