import { creditSourceLabel } from "@/lib/credit-format";
import { cn } from "@/lib/utils";
import type { CreditApplicationSource } from "@/types/credit";

const TONE: Record<CreditApplicationSource, string> = {
  WEBSITE: "bg-amber-50 text-amber-900 border-amber-200",
  CUSTOMER_WEB: "bg-indigo-50 text-indigo-800 border-indigo-200",
  CUSTOMER_APP: "bg-sky-50 text-sky-800 border-sky-200",
  SELLER_WEB: "bg-violet-50 text-violet-800 border-violet-200",
  SELLER_APP: "bg-teal-50 text-teal-800 border-teal-200",
  ADMIN: "bg-navy/10 text-navy border-navy/20",
};

export function CreditSourceBadge({
  source,
  className,
}: {
  source: CreditApplicationSource | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold",
        source ? TONE[source] : "border-dashed border-slate-300 bg-white text-slate-500",
        className,
      )}
    >
      {creditSourceLabel(source)}
    </span>
  );
}
