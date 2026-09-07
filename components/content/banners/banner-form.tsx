"use client";

import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { CreativeUpload } from "@/components/content/banners/creative-upload";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CAMPAIGN_TYPE_LABELS,
  CTA_LABELS,
  CUSTOMER_AUDIENCES,
  hasCustomerPlatform,
  hasSellerPlatform,
  PLATFORM_LABELS,
  PRIORITY_LABELS,
  relevantPlacements,
  SELLER_AUDIENCES,
  TIMEZONE,
  validateBannerForm,
} from "@/lib/banner-utils";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import type {
  Banner,
  BannerAudience,
  BannerInput,
  BannerPlacement,
  BannerPlatform,
  BannerPriority,
  BannerSaveAction,
  CampaignType,
  CtaAction,
} from "@/types/banner";
import type { BannerFormErrors } from "@/lib/banner-utils";

function emptyForm(): BannerInput {
  return {
    name: "",
    campaignName: "",
    description: "",
    campaignType: "PROMOTIONAL",
    platforms: [],
    placements: [],
    desktopImage: undefined,
    mobileImage: undefined,
    headline: "",
    subheadline: "",
    ctaText: "",
    ctaAction: "NO_ACTION",
    targetId: "",
    externalUrl: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "23:59",
    timezone: TIMEZONE,
    status: "DRAFT",
    priority: 3,
    displayOrder: 10,
    audience: [],
  };
}

function fromBanner(banner: Banner): BannerInput {
  return {
    name: banner.name,
    campaignName: banner.campaignName,
    description: banner.description,
    campaignType: banner.campaignType,
    platforms: [...banner.platforms],
    placements: [...banner.placements],
    desktopImage: banner.desktopImage,
    mobileImage: banner.mobileImage,
    desktopMediaId: banner.desktopMediaId,
    mobileMediaId: banner.mobileMediaId,
    headline: banner.headline,
    subheadline: banner.subheadline,
    ctaText: banner.ctaText,
    ctaAction: banner.ctaAction,
    targetId: banner.targetId,
    externalUrl: banner.externalUrl,
    startDate: banner.startDate,
    startTime: banner.startTime,
    endDate: banner.endDate,
    endTime: banner.endTime,
    timezone: "Asia/Kolkata",
    status: banner.status,
    priority: banner.priority,
    displayOrder: banner.displayOrder,
    audience: banner.audience ? [...banner.audience] : [],
  };
}

interface BannerFormProps {
  open: boolean;
  mode: "create" | "edit";
  banner?: Banner | null;
  onOpenChange: (open: boolean) => void;
  onSave: (values: BannerInput, action: BannerSaveAction) => Promise<void> | void;
  onPreview: (values: BannerInput) => void;
}

export function BannerForm({ open, mode, banner, onOpenChange, onSave, onPreview }: BannerFormProps) {
  const products = useDataStore((s) => s.products);
  const offers = useDataStore((s) => s.offers);
  const [values, setValues] = useState<BannerInput>(emptyForm);
  const [errors, setErrors] = useState<BannerFormErrors>({});
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && banner) {
      setValues(fromBanner(banner));
      setPaused(banner.status === "PAUSED");
    } else {
      setValues(emptyForm());
      setPaused(false);
    }
    setErrors({});
  }, [open, mode, banner]);

  const placements = useMemo(() => relevantPlacements(values.platforms), [values.platforms]);
  const showCustomerAudience = hasCustomerPlatform(values.platforms);
  const showSellerAudience = hasSellerPlatform(values.platforms);

  function patch(partial: Partial<BannerInput>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  function togglePlatform(platform: BannerPlatform) {
    const next = values.platforms.includes(platform)
      ? values.platforms.filter((item) => item !== platform)
      : [...values.platforms, platform];
    const allowed = new Set(relevantPlacements(next).map((item) => item.id));
    patch({
      platforms: next,
      placements: values.placements.filter((item) => allowed.has(item)),
    });
  }

  function togglePlacement(id: BannerPlacement) {
    patch({
      placements: values.placements.includes(id)
        ? values.placements.filter((item) => item !== id)
        : [...values.placements, id],
    });
  }

  function toggleAudience(id: BannerAudience) {
    const current = values.audience ?? [];
    patch({
      audience: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    });
  }

  async function submit(action: BannerSaveAction) {
    const nextErrors = validateBannerForm(values, action);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      const payload: BannerInput = {
        ...values,
        status: paused && action !== "draft" ? "PAUSED" : "DRAFT",
      };
      await onSave(payload, action);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{mode === "create" ? "Create Banner" : "Edit Banner"}</SheetTitle>
          <SheetDescription>
            Configure creative, targeting, schedule and CTA. Timezone is {TIMEZONE}.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Section title="Basic Information">
            <Field label="Banner Name" error={errors.name}>
              <Input value={values.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Diwali Fuel Offer" />
            </Field>
            <Field label="Campaign Name">
              <Input
                value={values.campaignName}
                onChange={(e) => patch({ campaignName: e.target.value })}
                placeholder="Festival Campaign"
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                value={values.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
                rows={3}
              />
            </Field>
            <Field label="Campaign Type">
              <Select
                value={values.campaignType}
                onValueChange={(value) => patch({ campaignType: value as CampaignType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {CAMPAIGN_TYPE_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="Banner Creative" error={errors.creative}>
            <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2">
              <CreativeUpload
                label="Desktop Banner"
                hint="Recommended ~16:5"
                value={values.desktopImage}
                onChange={(desktopImage) => patch({ desktopImage })}
                aspectClassName="aspect-[16/5] min-h-[120px]"
              />
              <CreativeUpload
                label="Mobile Banner"
                hint="Recommended 4:3 or 9:5"
                value={values.mobileImage}
                onChange={(mobileImage) => patch({ mobileImage })}
                aspectClassName="aspect-[4/3] min-h-[140px]"
              />
            </div>
          </Section>

          <Section title="Platform Targeting" error={errors.platforms}>
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
                  Select All
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => patch({ platforms: [], placements: [] })}>
                  Clear All
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(PLATFORM_LABELS) as BannerPlatform[]).map((platform) => (
                  <label key={platform} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Checkbox
                      checked={values.platforms.includes(platform)}
                      onCheckedChange={() => togglePlatform(platform)}
                    />
                    {PLATFORM_LABELS[platform]}
                  </label>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Placement Targeting" error={errors.placements}>
            <div className="sm:col-span-2">
              {placements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Select a platform to see available placements.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {placements.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Checkbox
                        checked={values.placements.includes(item.id)}
                        onCheckedChange={() => togglePlacement(item.id)}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <Section title="Banner Content">
            <Field label="Headline" error={errors.headline} className="sm:col-span-2">
              <Input
                value={values.headline}
                onChange={(e) => patch({ headline: e.target.value })}
                placeholder="Special Bulk Fuel Pricing"
              />
            </Field>
            <Field label="Subheadline" className="sm:col-span-2">
              <Input
                value={values.subheadline ?? ""}
                onChange={(e) => patch({ subheadline: e.target.value })}
                placeholder="Get better rates on bulk orders."
              />
            </Field>
            <Field label="CTA Text">
              <Input
                value={values.ctaText ?? ""}
                onChange={(e) => patch({ ctaText: e.target.value })}
                placeholder="Explore Offers"
              />
            </Field>
            <Field label="CTA Action">
              <Select
                value={values.ctaAction ?? "NO_ACTION"}
                onValueChange={(value) =>
                  patch({ ctaAction: value as CtaAction, targetId: "", externalUrl: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CTA_LABELS) as CtaAction[]).map((item) => (
                    <SelectItem key={item} value={item}>
                      {CTA_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {values.ctaAction === "OPEN_PRODUCT" ? (
              <Field label="Select Product" error={errors.targetId} className="sm:col-span-2">
                <Select value={values.targetId || undefined} onValueChange={(targetId) => patch({ targetId })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.grade} · {product.commodity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            {values.ctaAction === "OPEN_OFFER" ? (
              <Field label="Select Offer" error={errors.targetId} className="sm:col-span-2">
                <Select value={values.targetId || undefined} onValueChange={(targetId) => patch({ targetId })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an offer" />
                  </SelectTrigger>
                  <SelectContent>
                    {offers.map((offer) => (
                      <SelectItem key={offer.id} value={offer.id}>
                        {offer.id} · {offer.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            {values.ctaAction === "OPEN_EXTERNAL_URL" ? (
              <Field label="External URL" error={errors.externalUrl} className="sm:col-span-2">
                <Input
                  value={values.externalUrl ?? ""}
                  onChange={(e) => patch({ externalUrl: e.target.value })}
                  placeholder="https://"
                />
              </Field>
            ) : null}
          </Section>

          <Section title="Schedule">
            <Field label="Start Date" error={errors.startDate}>
              <Input type="date" value={values.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
            </Field>
            <Field label="Start Time">
              <Input type="time" value={values.startTime} onChange={(e) => patch({ startTime: e.target.value })} />
            </Field>
            <Field label="End Date" error={errors.endDate}>
              <Input type="date" value={values.endDate} onChange={(e) => patch({ endDate: e.target.value })} />
            </Field>
            <Field label="End Time">
              <Input type="time" value={values.endTime} onChange={(e) => patch({ endTime: e.target.value })} />
            </Field>
            <Field label="Timezone" className="sm:col-span-2">
              <Input value={TIMEZONE} readOnly />
            </Field>
            <div className="sm:col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Pause Campaign</p>
                <p className="text-xs text-muted-foreground">Paused banners do not serve on any platform.</p>
              </div>
              <Switch checked={paused} onCheckedChange={setPaused} />
            </div>
          </Section>

          <Section title="Priority / Display Order">
            <Field label="Priority">
              <Select
                value={String(values.priority)}
                onValueChange={(value) => patch({ priority: Number(value) as BannerPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([1, 2, 3, 4, 5] as BannerPriority[]).map((item) => (
                    <SelectItem key={item} value={String(item)}>
                      {PRIORITY_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Display Order">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={values.displayOrder}
                  onChange={(e) => patch({ displayOrder: Number(e.target.value) || 0 })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => patch({ displayOrder: values.displayOrder + 1 })}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => patch({ displayOrder: Math.max(0, values.displayOrder - 1) })}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Higher priority banners appear first when multiple banners are active.
              </p>
            </Field>
          </Section>

          <Section title="Audience Targeting">
            <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
              {showCustomerAudience ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                  <div className="space-y-2">
                    {CUSTOMER_AUDIENCES.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={values.audience?.includes(item.id)}
                          onCheckedChange={() => toggleAudience(item.id)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              {showSellerAudience ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seller</p>
                  <div className="space-y-2">
                    {SELLER_AUDIENCES.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={values.audience?.includes(item.id)}
                          onCheckedChange={() => toggleAudience(item.id)}
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                !showCustomerAudience && (
                  <p className="text-sm text-muted-foreground">Select a platform to configure audience filters.</p>
                )
              )}
            </div>
          </Section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-white px-5 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onPreview(values)}>
              <Eye className="size-3.5" />
              Preview Banner
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => void submit("draft")}>
              Save Draft
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={() => void submit("schedule")}>
              Schedule Banner
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submit("activate")}>
              Activate Now
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
