"use client";

import { Building2, Eye, EyeOff, Factory, FolderTree, IndianRupee, Layers, ToggleLeft } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import { KpiSkeleton } from "@/components/shared/states";
import { useGradeStore } from "@/store/grade-store";

export function GradeKpiCards() {
  const stats = useGradeStore((s) => s.stats);
  const setFilters = useGradeStore((s) => s.setFilters);
  const resetFilters = useGradeStore((s) => s.resetFilters);

  if (!stats) return <KpiSkeleton count={8} />;

  const lastImport = stats.lastImport?.completedAt
    ? `Last import ${new Date(stats.lastImport.completedAt).toLocaleDateString()}`
    : undefined;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Total Grades" value={String(stats.total)} hint={lastImport} icon={Layers} onClick={resetFilters} />
      <KpiCard
        label="Active Grades"
        value={String(stats.active)}
        icon={ToggleLeft}
        tone="success"
        onClick={() => setFilters({ status: "ACTIVE" })}
      />
      <KpiCard
        label="Inactive Grades"
        value={String(stats.inactive)}
        icon={EyeOff}
        tone="warning"
        onClick={() => setFilters({ status: "INACTIVE" })}
      />
      <KpiCard
        label="In Today's Delhi List"
        value={String(stats.inTodaysDelhiPriceList)}
        icon={IndianRupee}
        onClick={() => setFilters({ inTodaysDelhiPriceList: "YES" })}
      />
      <KpiCard
        label="Customer Visible"
        value={String(stats.customerVisible)}
        icon={Eye}
        onClick={() => setFilters({ customerVisible: "VISIBLE" })}
      />
      <KpiCard
        label="Seller Visible"
        value={String(stats.sellerVisible)}
        icon={Factory}
        onClick={() => setFilters({ sellerVisible: "VISIBLE" })}
      />
      <KpiCard label="Categories" value={String(stats.categories)} icon={FolderTree} />
      <KpiCard label="Manufacturers" value={String(stats.manufacturers)} icon={Building2} />
    </div>
  );
}
