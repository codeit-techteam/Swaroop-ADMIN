"use client";

import { AlertTriangle, ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChartCard } from "@/components/shared/chart-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { bannerKpis, STATUS_LABELS } from "@/lib/banner-utils";
import { useBannerStore } from "@/store/banner-store";

export function CmsOverview() {
  const router = useRouter();
  const banners = useBannerStore((s) => s.banners);
  const kpis = bannerKpis(banners);
  const recent = [...banners].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const expiringTomorrow = banners.filter(
    (item) => item.status === "ACTIVE" && item.endDate === tomorrowKey,
  ).length;

  const weekStart = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const scheduledThisWeek = banners.filter((item) => {
    if (item.status !== "SCHEDULED") return false;
    const start = new Date(`${item.startDate}T00:00:00+05:30`);
    return start >= weekStart && start <= weekEnd;
  }).length;

  const alerts = [
    ...(expiringTomorrow
      ? [
          {
            id: "expire",
            message:
              expiringTomorrow === 1
                ? "Banner campaign expires tomorrow"
                : `${expiringTomorrow} banner campaigns expire tomorrow`,
          },
        ]
      : []),
    ...(scheduledThisWeek
      ? [{ id: "scheduled", message: `${scheduledThisWeek} banners are scheduled this week` }]
      : []),
    ...(kpis.drafts ? [{ id: "drafts", message: `${kpis.drafts} banners are still in draft` }] : []),
  ];

  return (
    <section className="rounded-md border bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-primary" />
          <p className="section-label">Content Management</p>
        </div>
        <Link href="/content/banners" className="text-xs font-medium text-primary hover:underline">
          Open Banner Management
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button type="button" onClick={() => router.push("/content/banners")} className="rounded-md border p-3 text-left hover:border-primary/40">
          <p className="text-xs text-muted-foreground">Active Banners</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700">{kpis.active}</p>
        </button>
        <button type="button" onClick={() => router.push("/content/banners")} className="rounded-md border p-3 text-left hover:border-primary/40">
          <p className="text-xs text-muted-foreground">Scheduled</p>
          <p className="mt-1 text-xl font-semibold">{kpis.scheduled}</p>
        </button>
        <button type="button" onClick={() => router.push("/content/banners")} className="rounded-md border p-3 text-left hover:border-primary/40">
          <p className="text-xs text-muted-foreground">Drafts</p>
          <p className="mt-1 text-xl font-semibold">{kpis.drafts}</p>
        </button>
        <button type="button" onClick={() => router.push("/content/banners")} className="rounded-md border p-3 text-left hover:border-primary/40">
          <p className="text-xs text-muted-foreground">Expired</p>
          <p className="mt-1 text-xl font-semibold text-amber-700">{kpis.expired}</p>
        </button>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Recent Campaigns">
          <ul className="space-y-2">
            {recent.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => router.push("/content/banners")}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="truncate font-medium">{item.name}</span>
                  <StatusBadge value={STATUS_LABELS[item.status]} />
                </button>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard title="Banner Alerts">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No banner alerts right now.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => router.push("/content/banners")}
                    className="flex w-full items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800 hover:border-amber-300"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {alert.message}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
