"use client";

import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  tone?: "default" | "warning" | "danger" | "success";
  className?: string;
}

const tones = {
  default: "text-slate-900",
  warning: "text-amber-700",
  danger: "text-red-700",
  success: "text-emerald-700",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  onClick,
  active,
  tone = "default",
  className,
}: KpiCardProps) {
  const router = useRouter();
  const clickable = Boolean(href || onClick);
  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) onClick();
        else if (href) router.push(href);
      }}
      className={cn(
        "rounded-md border border-slate-200 bg-white p-4 text-left shadow-soft transition hover:border-primary/40 hover:shadow-card",
        clickable ? "cursor-pointer" : "cursor-default",
        active && "border-primary/50 ring-1 ring-primary/20",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">{label}</p>
          <p className={cn("mt-1.5 text-2xl font-semibold tracking-tight", tones[tone])}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex size-9 items-center justify-center rounded-md bg-[#E8F1FF] text-primary">
            <Icon className="size-4" />
          </div>
        ) : null}
      </div>
    </button>
  );
}
