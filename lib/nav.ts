import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  Building2,
  ClipboardCheck,
  CreditCard,
  Factory,
  FileText,
  ScrollText,
  Handshake,
  Layers,
  LayoutDashboard,
  PackageSearch,
  Headset,
  ShieldAlert,
  ShieldCheck,
  Ship,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  ImageIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const adminNav: NavSection[] = [
  {
    label: "CORE",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/procurement", label: "Procurement Workbench", icon: ClipboardCheck },
    ],
  },
  {
    label: "ECOSYSTEM",
    items: [
      { href: "/customers", label: "Customers", icon: Building2 },
      { href: "/sellers", label: "Sellers", icon: Factory },
      { href: "/users", label: "Users", icon: Users },
      { href: "/kyc", label: "KYC", icon: ShieldCheck },
      { href: "/catalog", label: "Catalog", icon: PackageSearch },
    ],
  },
  {
    label: "MASTER DATA",
    items: [{ href: "/master-data/grades", label: "Grade Master", icon: Layers }],
  },
  {
    label: "COMMERCE",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingCart },
      { href: "/offers", label: "Offers", icon: Handshake },
      { href: "/import-trading", label: "Import Trading", icon: Ship },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { href: "/payments", label: "Payments", icon: CreditCard },
      { href: "/credit", label: "Credit Management", icon: ShieldAlert },
      { href: "/receivables", label: "Receivables", icon: Wallet },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/logistics", label: "Logistics", icon: Truck },
      { href: "/support", label: "Support Tickets", icon: Headset },
    ],
  },
  {
    label: "INSIGHTS",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }],
  },
  {
    label: "CONTENT MANAGEMENT",
    items: [
      { href: "/content/banners", label: "Banner Management", icon: ImageIcon },
      { href: "/content/push-notifications", label: "Push Notifications", icon: BellRing },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/documents", label: "Documents", icon: FileText },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/procurement") {
    return pathname === "/procurement" || pathname.startsWith("/procurement/");
  }
  if (href === "/credit") {
    return pathname === "/credit" || pathname.startsWith("/credit/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
