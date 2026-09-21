"use client";

import { CreditNav } from "@/components/credit/credit-nav";

export default function CreditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <CreditNav />
      {children}
    </div>
  );
}
