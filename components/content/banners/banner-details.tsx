"use client";

import { DetailDrawer, DetailRow } from "@/components/shared/detail-drawer";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import {
  audienceLabel,
  CAMPAIGN_TYPE_LABELS,
  CTA_LABELS,
  PLATFORM_LABELS,
  placementLabel,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/banner-utils";
import type { Banner } from "@/types/banner";

interface BannerDetailsProps {
  banner: Banner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (banner: Banner) => void;
  onPreview: (banner: Banner) => void;
}

export function BannerDetails({ banner, open, onOpenChange, onEdit, onPreview }: BannerDetailsProps) {
  if (!banner) return null;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Banner Details"
      description={banner.id}
      contentClassName="sm:max-w-lg"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => onPreview(banner)}>
            Preview
          </Button>
          <Button type="button" onClick={() => onEdit(banner)}>
            Edit
          </Button>
        </div>
      }
    >
      <div className="mb-4 overflow-hidden rounded-md border">
        {banner.desktopImage || banner.mobileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.desktopImage || banner.mobileImage} alt="" className="h-32 w-full object-cover" />
        ) : (
          <div className="flex h-32 items-center justify-center bg-slate-100 text-sm text-muted-foreground">
            No creative
          </div>
        )}
      </div>
      <dl>
        <DetailRow label="Banner Name" value={banner.name} />
        <DetailRow label="Campaign" value={banner.campaignName} />
        <DetailRow label="Type" value={CAMPAIGN_TYPE_LABELS[banner.campaignType]} />
        <DetailRow label="Status" value={<StatusBadge value={STATUS_LABELS[banner.status]} />} />
        <DetailRow
          label="Platforms"
          value={
            <span className="flex flex-wrap gap-1">
              {banner.platforms.map((platform) => (
                <SourceBadge key={platform} source={PLATFORM_LABELS[platform]} />
              ))}
            </span>
          }
        />
        <DetailRow label="Placements" value={banner.placements.map(placementLabel).join(", ")} />
        <DetailRow
          label="Layout"
          value={banner.layoutVariant === "NAVY_GRID" ? "Navy grid hero" : "Image creative"}
        />
        <DetailRow label="Eyebrow" value={banner.badge || "—"} />
        <DetailRow label="Headline" value={banner.headline} />
        <DetailRow label="Subheadline" value={banner.subheadline || "—"} />
        <DetailRow label="Primary CTA" value={banner.ctaText || "—"} />
        <DetailRow label="Primary Action" value={banner.ctaAction ? CTA_LABELS[banner.ctaAction] : "—"} />
        <DetailRow label="Secondary CTA" value={banner.secondaryCtaText || "—"} />
        <DetailRow
          label="Secondary Action"
          value={
            banner.secondaryCtaAction ? CTA_LABELS[banner.secondaryCtaAction] : "—"
          }
        />
        <DetailRow
          label="Schedule"
          value={`${formatDate(banner.startDate)} ${banner.startTime} – ${formatDate(banner.endDate)} ${banner.endTime}`}
        />
        <DetailRow label="Timezone" value={banner.timezone} />
        <DetailRow label="Priority" value={PRIORITY_LABELS[banner.priority]} />
        <DetailRow label="Display order" value={String(banner.displayOrder)} />
        <DetailRow
          label="Audience"
          value={banner.audience?.length ? banner.audience.map(audienceLabel).join(", ") : "All"}
        />
        <DetailRow label="Created By" value={banner.createdBy} />
        <DetailRow label="Created At" value={formatDateTime(banner.createdAt)} />
        <DetailRow label="Updated At" value={formatDateTime(banner.updatedAt)} />
      </dl>
      <div className="mt-4 rounded-md border bg-slate-50 p-3">
        <p className="section-label mb-2">Performance</p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground">Impressions</p>
            <p className="font-semibold">{formatNumber(banner.impressions)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Clicks</p>
            <p className="font-semibold">{formatNumber(banner.clicks)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">CTR</p>
            <p className="font-semibold">{banner.ctr.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </DetailDrawer>
  );
}
