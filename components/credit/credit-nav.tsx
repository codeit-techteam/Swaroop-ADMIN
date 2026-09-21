"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/credit", label: "Overview" },
  { href: "/credit/applications", label: "Applications" },
  { href: "/credit/accounts", label: "Accounts" },
  { href: "/credit/utilization", label: "Utilization" },
  { href: "/credit/repayments", label: "Repayments" },
  { href: "/credit/transactions", label: "Transactions" },
  { href: "/credit/documents", label: "Documents" },
  { href: "/credit/insurance", label: "Insurance" },
  { href: "/credit/audit", label: "Audit" },
] as const;

export function CreditNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 rounded-md border bg-white p-1">
      {ITEMS.map((item) => {
        const active =
          item.href === "/credit"
            ? pathname === "/credit"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-medium transition",
              active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
