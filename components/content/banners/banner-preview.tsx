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
            <div className="bg-slate-50">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={banner.headline}
                  className={cn("w-full object-cover", device === "mobile" ? "h-40" : "h-36")}
                />
              ) : (
                <div className={cn("flex items-center justify-center bg-slate-200 text-sm", device === "mobile" ? "h-40" : "h-36")}>
                  No creative
                </div>
              )}
              <div className="px-3 py-3">
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
