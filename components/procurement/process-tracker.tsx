"use client";

import { PROCESS_STAGES, stageState } from "@/lib/procurement";
import { cn } from "@/lib/utils";
import type { ProcurementStatus } from "@/types";

export function ProcessTracker({ status }: { status: ProcurementStatus }) {
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1">
      {PROCESS_STAGES.map((stage, index) => {
        const state = stageState(status, index);
        return (
          <li key={stage.key} className="min-w-[92px] flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full",
                state === "complete" && "bg-emerald-500",
                state === "current" && "bg-sky-600",
                state === "upcoming" && "bg-slate-200",
              )}
            />
            <p
              className={cn(
                "mt-1.5 text-[10px] font-medium leading-tight",
                state === "complete" && "text-emerald-700",
                state === "current" && "text-sky-700",
                state === "upcoming" && "text-slate-400",
              )}
            >
              {index + 1}. {stage.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
