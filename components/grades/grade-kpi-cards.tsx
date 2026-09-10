"use client";

import { Eye, EyeOff, Factory, Layers, ToggleLeft } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import { gradeKpis } from "@/lib/grade-utils";
import { useGradeStore } from "@/store/grade-store";

export function GradeKpiCards() {
  const grades = useGradeStore((s) => s.grades);
  const setFilters = useGradeStore((s) => s.setFilters);
  const kpis = gradeKpis(grades);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        label="Total Grades"
        value={String(kpis.total)}
        icon={Layers}
        onClick={() => setFilters({ status: "ALL", customerVisible: "ALL", sellerVisible: "ALL" })}
      />
      <KpiCard
        label="Active Grades"
        value={String(kpis.active)}
        icon={ToggleLeft}
        tone="success"
        onClick={() => setFilters({ status: "ACTIVE" })}
      />
      <KpiCard
        label="Inactive Grades"
        value={String(kpis.inactive)}
        icon={EyeOff}
        tone="warning"
        onClick={() => setFilters({ status: "INACTIVE" })}
      />
      <KpiCard
        label="Customer Visible"
        value={String(kpis.customerVisible)}
        icon={Eye}
        onClick={() => setFilters({ customerVisible: "VISIBLE" })}
      />
      <KpiCard
        label="Seller Visible"
        value={String(kpis.sellerVisible)}
        icon={Factory}
        onClick={() => setFilters({ sellerVisible: "VISIBLE" })}
      />
    </div>
  );
}
