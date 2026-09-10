"use client";

import { useMemo } from "react";

import { SourceBadge } from "@/components/shared/source-badge";
import { CHANNEL_LABELS, PLATFORM_LABELS } from "@/lib/push-notification-utils";
import { cn } from "@/lib/utils";
import type { PushNotification, PushNotificationInput } from "@/types/push-notification";

interface PushPreviewCardProps {
  values: PushNotification | PushNotificationInput;
  className?: string;
}

export function PushPreviewCard({ values, className }: PushPreviewCardProps) {
  const platforms = values.platforms;
  const isSeller = platforms.some((p) => p.startsWith("SELLER"));
  const appLabel = isSeller && !platforms.some((p) => p.startsWith("CUSTOMER")) ? "Seller" : "Customer";

  return (
    <div className={cn("mx-auto w-[280px]", className)}>
      <div className="rounded-[28px] border-4 border-slate-900 bg-slate-900 p-2 shadow-card">
        <div className="rounded-[20px] bg-[#F4F6F9] pb-4">
          <div className="flex items-center justify-center py-2">
            <span className="h-1.5 w-16 rounded-full bg-slate-700" />
          </div>
          <div className="px-3">
            <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {appLabel} · {values.channels.map((c) => CHANNEL_LABELS[c]).join(" + ")}
            </p>
            <div className="rounded-xl border bg-white p-3 shadow-soft">
              <div className="mb-2 flex items-start gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#0B1220] text-[10px] font-bold text-white">
                  PT
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500">PetroTrade</p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {values.title || "Notification title"}
                  </p>
                </div>
              </div>
              <p className="text-xs leading-5 text-slate-600">
                {values.body || "Write the message customers and sellers will see on app and web."}
              </p>
              {values.ctaText ? (
                <p className="mt-2 text-[11px] font-semibold text-primary">{values.ctaText} →</p>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {platforms.length === 0 ? (
                <span className="text-[10px] text-muted-foreground">No platforms selected</span>
              ) : (
                platforms.map((platform) => (
                  <SourceBadge key={platform} source={PLATFORM_LABELS[platform]} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
