import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

export function GradeVisibilityBadge({ visible, compact = false }: { visible: boolean; compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        visible ? "text-emerald-700" : "text-slate-500",
      )}
    >
      {visible ? <Check className="size-3.5" /> : <Minus className="size-3.5" />}
      {compact ? (visible ? "Visible" : "Hidden") : visible ? "Visible" : "Hidden"}
    </span>
  );
}
