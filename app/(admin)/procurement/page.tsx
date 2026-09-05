"use client";

import { Suspense } from "react";

import { ProcurementWorkbench } from "@/components/procurement/workbench";

export default function ProcurementPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading workbench…</div>}>
      <ProcurementWorkbench initialView="table" />
    </Suspense>
  );
}
