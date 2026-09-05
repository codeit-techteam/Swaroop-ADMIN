import { cn } from "@/lib/utils";
import type { AppSource } from "@/types";

const TONE: Record<AppSource, string> = {
  "Customer App": "bg-sky-50 text-sky-800 border-sky-200",
  "Customer Web": "bg-indigo-50 text-indigo-800 border-indigo-200",
  "Seller App": "bg-teal-50 text-teal-800 border-teal-200",
  "Seller Web": "bg-violet-50 text-violet-800 border-violet-200",
  "Admin Portal": "bg-navy/10 text-navy border-navy/20",
};

export function SourceBadge({ source, className }: { source: AppSource; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TONE[source],
        className,
      )}
    >
      {source}
    </span>
  );
}
