"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PushPreviewCard } from "@/components/push-notifications/push-preview";
import { audienceLabel, CHANNEL_LABELS } from "@/lib/push-notification-utils";
import { formatNumber } from "@/lib/format";
import type { PushNotification } from "@/types/push-notification";

interface PushPreviewSheetProps {
  open: boolean;
  notification: PushNotification | null;
  onOpenChange: (open: boolean) => void;
}

export function PushPreviewSheet({ open, notification, onOpenChange }: PushPreviewSheetProps) {
  if (!notification) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>Notification preview</SheetTitle>
          <SheetDescription>
            {audienceLabel(notification)} · {notification.channels.map((c) => CHANNEL_LABELS[c]).join(" + ")}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-5 py-8">
          <PushPreviewCard values={notification} />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Reaches about {formatNumber(notification.targeted)} Customer / Seller devices
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
