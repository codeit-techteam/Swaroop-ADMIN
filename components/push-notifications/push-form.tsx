"use client";

import { Eye } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { PushPreviewCard } from "@/components/push-notifications/push-preview";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  CTA_LABELS,
  CUSTOMER_CTA_ACTIONS,
  CUSTOMER_DEEP_LINKS,
  CUSTOMER_SEGMENTS,
  estimateReach,
  hasCustomerPlatform,
  hasSellerPlatform,
  PLATFORM_LABELS,
  PRIORITY_LABELS,
  SELLER_CTA_ACTIONS,
  SELLER_DEEP_LINKS,
  SELLER_SEGMENTS,
  TIMEZONE,
  validatePushForm,
  type PushFormErrors,
} from "@/lib/push-notification-utils";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  CustomerSegment,
  PushCategory,
  PushChannel,
  PushCtaAction,
  PushNotification,
  PushNotificationInput,
  PushPlatform,
  PushPriority,
  PushSaveAction,
  SellerSegment,
} from "@/types/push-notification";

function emptyForm(): PushNotificationInput {
  return {
    name: "",
    title: "",
    body: "",
    category: "ANNOUNCEMENT",
    priority: "NORMAL",
    platforms: [],
    channels: ["PUSH", "IN_APP"],
    audienceMode: "ALL",
    customerSegments: [],
    sellerSegments: [],
    ctaText: "",
    ctaAction: "NO_ACTION",
    deepLink: "",
    status: "DRAFT",
    timezone: TIMEZONE,
    scheduledDate: "",
    scheduledTime: "09:00",
  };
}

function fromPush(item: PushNotification): PushNotificationInput {
  return {
    name: item.name,
    title: item.title,
    body: item.body,
    category: item.category,
    priority: item.priority,
    platforms: [...item.platforms],
    channels: [...item.channels],
    audienceMode: item.audienceMode,
    customerSegments: [...item.customerSegments],
    sellerSegments: [...item.sellerSegments],
    ctaText: item.ctaText,
    ctaAction: item.ctaAction,
    deepLink: item.deepLink,
    imageUrl: item.imageUrl,
    status: item.status,
    timezone: "Asia/Kolkata",
    scheduledDate: item.scheduledDate,
    scheduledTime: item.scheduledTime,
    scheduledAt: item.scheduledAt,
  };
}

interface PushFormProps {
  open: boolean;
  mode: "create" | "edit";
  notification?: PushNotification | null;
  onOpenChange: (open: boolean) => void;
  onSave: (values: PushNotificationInput, action: PushSaveAction) => Promise<void> | void;
  onPreview: (values: PushNotificationInput) => void;
}

export function PushForm({ open, mode, notification, onOpenChange, onSave, onPreview }: PushFormProps) {
  const [values, setValues] = useState<PushNotificationInput>(emptyForm);
  const [errors, setErrors] = useState<PushFormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && notification) setValues(fromPush(notification));
    else setValues(emptyForm());
    setErrors({});
  }, [open, mode, notification]);

  const showCustomer = hasCustomerPlatform(values.platforms);
  const showSeller = hasSellerPlatform(values.platforms);
  const ctaOptions = useMemo(() => {
    if (showCustomer && showSeller) {
      return Array.from(new Set([...CUSTOMER_CTA_ACTIONS, ...SELLER_CTA_ACTIONS]));
    }
    if (showSeller) return SELLER_CTA_ACTIONS;
    return CUSTOMER_CTA_ACTIONS;
  }, [showCustomer, showSeller]);
  const reach = estimateReach(values);

  function patch(partial: Partial<PushNotificationInput>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  function togglePlatform(platform: PushPlatform) {
    const next = values.platforms.includes(platform)
      ? values.platforms.filter((item) => item !== platform)
      : [...values.platforms, platform];
    patch({
      platforms: next,
      customerSegments: hasCustomerPlatform(next) ? values.customerSegments : [],
      sellerSegments: hasSellerPlatform(next) ? values.sellerSegments : [],
    });
  }

  function toggleChannel(channel: PushChannel) {
    patch({
      channels: values.channels.includes(channel)
        ? values.channels.filter((item) => item !== channel)
        : [...values.channels, channel],
    });
  }

  function toggleCustomerSegment(id: CustomerSegment) {
    patch({
      customerSegments: values.customerSegments.includes(id)
        ? values.customerSegments.filter((item) => item !== id)
        : [...values.customerSegments, id],
    });
  }

  function toggleSellerSegment(id: SellerSegment) {
    patch({
      sellerSegments: values.sellerSegments.includes(id)
        ? values.sellerSegments.filter((item) => item !== id)
        : [...values.sellerSegments, id],
    });
  }

  function applyCta(action: PushCtaAction) {
    const deepLink = showSeller && !showCustomer ? SELLER_DEEP_LINKS[action] : CUSTOMER_DEEP_LINKS[action];
    patch({ ctaAction: action, deepLink });
  }

  async function submit(action: PushSaveAction) {
    const nextErrors = validatePushForm(values, action);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      await onSave(values, action);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{mode === "create" ? "Compose Push Notification" : "Edit Push Notification"}</SheetTitle>
          <SheetDescription>
            Send to Customer and Seller App / Web. Timezone is {TIMEZONE}. Estimated reach {formatNumber(reach)}.
          </SheetDescription>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[1fr_280px]">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <Section title="Campaign" error={errors.name}>
              <Field label="Internal name" error={errors.name} className="sm:col-span-2">
                <Input
                  value={values.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Navratri customer blast"
                />
              </Field>
              <Field label="Category">
                <Select
                  value={values.category}
                  onValueChange={(value) => patch({ category: value as PushCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as PushCategory[]).map((item) => (
                      <SelectItem key={item} value={item}>
                        {CATEGORY_LABELS[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <Select
                  value={values.priority}
                  onValueChange={(value) => patch({ priority: value as PushPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_LABELS) as PushPriority[]).map((item) => (
                      <SelectItem key={item} value={item}>
                        {PRIORITY_LABELS[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </Section>

            <Section title="Message" error={errors.title || errors.body}>
              <Field label={`Title (${values.title.length}/65)`} error={errors.title} className="sm:col-span-2">
                <Input
                  value={values.title}
                  maxLength={65}
                  onChange={(e) => patch({ title: e.target.value })}
                  placeholder="Monsoon bulk rates are live"
                />
              </Field>
              <Field label={`Body (${values.body.length}/240)`} error={errors.body} className="sm:col-span-2">
                <Textarea
                  value={values.body}
                  maxLength={240}
                  rows={4}
                  onChange={(e) => patch({ body: e.target.value })}
                  placeholder="Write the message that appears on Customer and Seller devices."
                />
              </Field>
            </Section>

            <Section title="Send to" error={errors.platforms || errors.channels}>
              <div className="sm:col-span-2 space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch({
                        platforms: ["CUSTOMER_APP", "CUSTOMER_WEB", "SELLER_APP", "SELLER_WEB"],
                      })
                    }
                  >
                    All platforms
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => patch({ platforms: [] })}>
                    Clear
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(PLATFORM_LABELS) as PushPlatform[]).map((platform) => (
                    <label key={platform} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Checkbox
                        checked={values.platforms.includes(platform)}
                        onCheckedChange={() => togglePlatform(platform)}
                      />
                      {PLATFORM_LABELS[platform]}
                    </label>
                  ))}
                </div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Channels</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CHANNEL_LABELS) as PushChannel[]).map((channel) => (
                    <label key={channel} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Checkbox
                        checked={values.channels.includes(channel)}
                        onCheckedChange={() => toggleChannel(channel)}
                      />
                      {CHANNEL_LABELS[channel]}
                    </label>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Audience" error={errors.customerSegments || errors.sellerSegments}>
              <div className="sm:col-span-2 space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={values.audienceMode === "ALL" ? "default" : "outline"}
                    onClick={() => patch({ audienceMode: "ALL" })}
                  >
                    All users on selected platforms
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={values.audienceMode === "SEGMENT" ? "default" : "outline"}
                    onClick={() => patch({ audienceMode: "SEGMENT" })}
                  >
                    Segments
                  </Button>
                </div>
                {values.audienceMode === "SEGMENT" ? (
                  <>
                    {showCustomer ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Customer segments
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {CUSTOMER_SEGMENTS.map((item) => (
                            <label key={item.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                              <Checkbox
                                checked={values.customerSegments.includes(item.id)}
                                onCheckedChange={() => toggleCustomerSegment(item.id)}
                              />
                              <span>
                                {item.label}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({formatNumber(item.reach)})
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {showSeller ? (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Seller segments
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {SELLER_SEGMENTS.map((item) => (
                            <label key={item.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                              <Checkbox
                                checked={values.sellerSegments.includes(item.id)}
                                onCheckedChange={() => toggleSellerSegment(item.id)}
                              />
                              <span>
                                {item.label}
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({formatNumber(item.reach)})
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {!showCustomer && !showSeller ? (
                      <p className="text-sm text-muted-foreground">Select a platform to choose segments.</p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Everyone on the selected Customer / Seller apps and webapps will receive this notification.
                  </p>
                )}
              </div>
            </Section>

            <Section title="Deep link / CTA">
              <Field label="CTA text">
                <Input
                  value={values.ctaText ?? ""}
                  onChange={(e) => patch({ ctaText: e.target.value })}
                  placeholder="View offers"
                />
              </Field>
              <Field label="Open screen">
                <Select value={values.ctaAction} onValueChange={(value) => applyCta(value as PushCtaAction)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ctaOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {CTA_LABELS[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Deep link" className="sm:col-span-2">
                <Input
                  value={values.deepLink ?? ""}
                  onChange={(e) => patch({ deepLink: e.target.value })}
                  placeholder="/marketplace"
                />
              </Field>
            </Section>

            <Section title="Schedule" error={errors.scheduledDate || errors.scheduledTime}>
              <Field label="Date" error={errors.scheduledDate}>
                <Input
                  type="date"
                  value={values.scheduledDate}
                  onChange={(e) => patch({ scheduledDate: e.target.value })}
                />
              </Field>
              <Field label="Time (IST)" error={errors.scheduledTime}>
                <Input
                  type="time"
                  value={values.scheduledTime}
                  onChange={(e) => patch({ scheduledTime: e.target.value })}
                />
              </Field>
            </Section>
          </div>
          <aside className="hidden border-l bg-slate-50 p-4 lg:block">
            <p className="section-label mb-3">Live preview</p>
            <PushPreviewCard values={values} />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Estimated reach {formatNumber(reach)} devices
            </p>
          </aside>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-white px-5 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onPreview(values)}>
              <Eye className="size-3.5" />
              Preview
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => void submit("draft")}>
              Save draft
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => void submit("schedule")}>
              Schedule
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submit("send")}>
              Send now
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 rounded-md border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
