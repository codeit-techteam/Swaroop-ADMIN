"use client";

import { DetailDrawer, DetailRow } from "@/components/shared/detail-drawer";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { PushPreviewCard } from "@/components/push-notifications/push-preview";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  audienceLabel,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  CTA_LABELS,
  deliveryRate,
  openRate,
  PLATFORM_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/push-notification-utils";
import type { PushNotification } from "@/types/push-notification";

interface PushDetailsDrawerProps {
  notification: PushNotification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (item: PushNotification) => void;
  onPreview: (item: PushNotification) => void;
  onSend?: (item: PushNotification) => void;
}

export function PushDetailsDrawer({
  notification,
  open,
  onOpenChange,
  onEdit,
  onPreview,
  onSend,
}: PushDetailsDrawerProps) {
  if (!notification) return null;
  const canEdit = notification.status === "DRAFT" || notification.status === "SCHEDULED";
  const canSend =
    notification.status === "DRAFT" || notification.status === "SCHEDULED" || notification.status === "FAILED";

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Push Notification"
      description={notification.id}
      contentClassName="sm:max-w-lg"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => onPreview(notification)}>
            Preview
          </Button>
          {canSend && onSend ? (
            <Button type="button" onClick={() => onSend(notification)}>
              Send now
            </Button>
          ) : canEdit ? (
            <Button type="button" onClick={() => onEdit(notification)}>
              Edit
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled>
              Already sent
            </Button>
          )}
        </div>
      }
    >
      <div className="mb-4">
        <PushPreviewCard values={notification} className="mx-auto" />
      </div>
      <dl>
        <DetailRow label="Internal name" value={notification.name} />
        <DetailRow label="Title" value={notification.title} />
        <DetailRow label="Body" value={notification.body} />
        <DetailRow label="Category" value={CATEGORY_LABELS[notification.category]} />
        <DetailRow label="Priority" value={<StatusBadge value={PRIORITY_LABELS[notification.priority]} />} />
        <DetailRow label="Status" value={<StatusBadge value={STATUS_LABELS[notification.status]} />} />
        <DetailRow
          label="Platforms"
          value={
            <span className="flex flex-wrap gap-1">
              {notification.platforms.map((platform) => (
                <SourceBadge key={platform} source={PLATFORM_LABELS[platform]} />
              ))}
            </span>
          }
        />
        <DetailRow
          label="Channels"
          value={notification.channels.map((channel) => CHANNEL_LABELS[channel]).join(" · ")}
        />
        <DetailRow label="Audience" value={audienceLabel(notification)} />
        <DetailRow label="CTA" value={notification.ctaText || "—"} />
        <DetailRow label="Open screen" value={CTA_LABELS[notification.ctaAction]} />
        <DetailRow label="Deep link" value={notification.deepLink || "—"} />
        <DetailRow
          label="Schedule"
          value={
            notification.scheduledDate
              ? `${notification.scheduledDate} ${notification.scheduledTime} ${notification.timezone}`
              : "—"
          }
        />
        <DetailRow label="Sent at" value={notification.sentAt ? formatDateTime(notification.sentAt) : "—"} />
        <DetailRow label="Created by" value={notification.createdBy} />
        <DetailRow label="Created at" value={formatDateTime(notification.createdAt)} />
      </dl>
      <div className="mt-4 rounded-md border bg-slate-50 p-3">
        <p className="section-label mb-2">Delivery</p>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Targeted</p>
            <p className="font-semibold">{formatNumber(notification.targeted)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Delivered</p>
            <p className="font-semibold">{formatNumber(notification.delivered)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Opened</p>
            <p className="font-semibold">{formatNumber(notification.opened)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Failed</p>
            <p className="font-semibold">{formatNumber(notification.failed)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Delivery {deliveryRate(notification)}% · Open {openRate(notification)}%
        </p>
      </div>
    </DetailDrawer>
  );
}
