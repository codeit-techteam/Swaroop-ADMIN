"use client";

import { CalendarClock, FileText, ImageIcon, Megaphone, PauseCircle } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import { bannerKpis } from "@/lib/banner-utils";
import { useBannerStore } from "@/store/banner-store";
import type { BannerStatus } from "@/types/banner";

export function BannerKpis() {
  const banners = useBannerStore((s) => s.banners);
  const setFilters = useBannerStore((s) => s.setFilters);
  const kpis = bannerKpis(banners);

  function filterStatus(status: BannerStatus | "ALL") {
    setFilters({ status });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard label="Total Banners" value={String(kpis.total)} icon={ImageIcon} onClick={() => filterStatus("ALL")} />
      <KpiCard
        label="Active Banners"
        value={String(kpis.active)}
        icon={Megaphone}
        tone="success"
        onClick={() => filterStatus("ACTIVE")}
      />
      <KpiCard
        label="Scheduled"
        value={String(kpis.scheduled)}
        icon={CalendarClock}
        onClick={() => filterStatus("SCHEDULED")}
      />
      <KpiCard label="Drafts" value={String(kpis.drafts)} icon={FileText} onClick={() => filterStatus("DRAFT")} />
      <KpiCard
        label="Expired"
        value={String(kpis.expired)}
        icon={PauseCircle}
        tone="warning"
        onClick={() => filterStatus("EXPIRED")}
      />
    </div>
  );
}
