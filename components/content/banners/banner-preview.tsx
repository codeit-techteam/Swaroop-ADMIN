"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PLATFORM_LABELS, placementLabel } from "@/lib/banner-utils";
import { cn } from "@/lib/utils";
import type { Banner, BannerPlatform } from "@/types/banner";

interface BannerPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner: Banner | null;
}

export function BannerPreview({ open, onOpenChange, banner }: BannerPreviewProps) {
  const initialPlatform = banner?.platforms[0] ?? "CUSTOMER_APP";
  const [platform, setPlatform] = useState<BannerPlatform>(initialPlatform);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const activePlatform = useMemo(() => {
    if (!banner) return platform;
    return banner.platforms.includes(platform) ? platform : (banner.platforms[0] ?? platform);
  }, [banner, platform]);

  if (!banner) return null;

  const image = device === "mobile" ? banner.mobileImage || banner.desktopImage : banner.desktopImage || banner.mobileImage;
  const isCustomer = activePlatform === "CUSTOMER_APP" || activePlatform === "CUSTOMER_WEB";
  const nav = isCustomer ? ["Home", "Marketplace", "Orders"] : ["Dashboard", "Offers", "Dispatch"];
  const isApp = activePlatform === "CUSTOMER_APP" || activePlatform === "SELLER_APP";
  const isNavyGrid = banner.layoutVariant === "NAVY_GRID" || (!image && banner.layoutVariant !== "IMAGE_OVERLAY");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setPlatform(banner.platforms[0] ?? "CUSTOMER_APP");
          setDevice(isApp ? "mobile" : "desktop");
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview Banner</DialogTitle>
          <DialogDescription>
            {banner.name} · {banner.placements.map(placementLabel).join(", ")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs value={activePlatform} onValueChange={(value) => setPlatform(value as BannerPlatform)}>
            <TabsList>
              {(Object.keys(PLATFORM_LABELS) as BannerPlatform[]).map((item) => (
                <TabsTrigger key={item} value={item} disabled={!banner.platforms.includes(item)} className="text-xs">
                  {PLATFORM_LABELS[item]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={device === "desktop" ? "default" : "outline"}
              onClick={() => setDevice("desktop")}
            >
              Desktop
            </Button>
            <Button
              type="button"
              size="sm"
              variant={device === "mobile" ? "default" : "outline"}
              onClick={() => setDevice("mobile")}
            >
              Mobile
            </Button>
          </div>
        </div>
        <div className="flex justify-center bg-slate-100 p-4">
          <div
            className={cn(
              "overflow-hidden rounded-lg border bg-white shadow-card",
              device === "mobile" ? "w-[320px]" : "w-full max-w-[720px]",
            )}
          >
            <div className="flex items-center justify-between border-b bg-[#0B1220] px-3 py-2 text-white">
              <span className="text-xs font-semibold tracking-wide">PetroTrade</span>
              <span className="text-[10px] uppercase text-sky-300">
                {PLATFORM_LABELS[activePlatform]}
              </span>
            </div>
            <div className="bg-slate-50 p-3">
              {isNavyGrid ? (
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl",
                    device === "mobile" ? "min-h-[160px]" : "min-h-[180px]",
                  )}
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 12% 20%, rgba(30,111,255,0.45), transparent 42%), linear-gradient(135deg, #0B2E59 0%, #123A6B 45%, #0F2A4A 100%)",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div
                    className={cn(
                      "relative flex flex-col gap-3 p-4",
                      device === "desktop" && "sm:flex-row sm:items-end sm:justify-between",
                    )}
                  >
                    <div className="max-w-md">
                      {banner.badge ? (
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                          {banner.badge}
                        </p>
                      ) : null}
                      <p className="text-base font-bold text-white">{banner.headline}</p>
                      {banner.subheadline ? (
                        <p className="mt-1 text-xs leading-relaxed text-white/85">{banner.subheadline}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      {banner.ctaText && banner.ctaAction !== "NO_ACTION" ? (
                        <Button type="button" size="sm" className="bg-white text-[#0B2E59] hover:bg-slate-100">
                          {banner.ctaText} →
                        </Button>
                      ) : null}
                      {banner.secondaryCtaText && banner.secondaryCtaAction !== "NO_ACTION" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                        >
                          {banner.secondaryCtaText}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={banner.headline}
                  className={cn("w-full rounded-md object-cover", device === "mobile" ? "h-40" : "h-36")}
                />
              ) : (
                <div className={cn("flex items-center justify-center rounded-md bg-slate-200 text-sm", device === "mobile" ? "h-40" : "h-36")}>
                  No creative
                </div>
              )}
              {!isNavyGrid ? (
                <div className="px-1 pt-3">
                  <p className="text-sm font-semibold">{banner.headline}</p>
                  {banner.subheadline ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{banner.subheadline}</p>
                  ) : null}
                  {banner.ctaText && banner.ctaAction !== "NO_ACTION" ? (
                    <Button type="button" size="sm" className="mt-3">
                      {banner.ctaText}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-3 border-t text-center text-[11px] text-muted-foreground">
              {nav.map((item) => (
                <div key={item} className="px-2 py-2">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
