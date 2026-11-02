"use client";

import { useEffect, useState } from "react";

import { PriceUnitField } from "@/components/shared/price-unit-field";
import { Button } from "@/components/ui/button";
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
  emptyGradeInput,
  gradeToInput,
  normalizeGradeCode,
  parseApplications,
  validateGradeInput,
  type GradeFormErrors,
} from "@/lib/grade-utils";
import { getLiveCategories } from "@/lib/grade-utils";
import {
  kgFromMt,
  mtFromKg,
  parsePriceInput,
  toPricePerKg,
  type PriceUnit,
} from "@/lib/price-units";
import { cn } from "@/lib/utils";
import type { Grade, GradeInput, GradeStatus } from "@/types/grade";

interface GradeFormProps {
  open?: boolean;
  mode: "create" | "edit";
  grade?: Grade | null;
  variant?: "drawer" | "page";
  onOpenChange?: (open: boolean) => void;
  onSave: (values: GradeInput, options?: { confirmCodeChange?: boolean }) => Promise<void> | void;
  existingCodes?: string[];
}

export function GradeForm({
  open = true,
  mode,
  grade,
  variant = "drawer",
  onOpenChange,
  onSave,
  existingCodes = [],
}: GradeFormProps) {
  const [values, setValues] = useState<GradeInput>(emptyGradeInput);
  const [errors, setErrors] = useState<GradeFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [codeLocked, setCodeLocked] = useState(mode === "edit");
  const [appDraft, setAppDraft] = useState("");
  const [featureDraft, setFeatureDraft] = useState("");
  const [priceUnit, setPriceUnit] = useState<PriceUnit>("KG");
  const [priceTodayDisplay, setPriceTodayDisplay] = useState("");
  const [producerPriceDisplay, setProducerPriceDisplay] = useState("");
  const imported = mode === "edit" && Boolean(grade?.source);

  useEffect(() => {
    if (variant === "drawer" && !open) return;
    if (mode === "edit" && grade) {
      setValues(gradeToInput(grade));
      setCodeLocked(true);
      setAppDraft("");
      setFeatureDraft("");
      setPriceUnit("KG");
      setPriceTodayDisplay(grade.priceTodayRsKg ?? "");
      setProducerPriceDisplay(grade.producerPriceRsKg ?? "");
    } else if (mode === "create") {
      setValues(emptyGradeInput());
      setCodeLocked(false);
      setAppDraft("");
      setFeatureDraft("");
      setPriceUnit("KG");
      setPriceTodayDisplay("");
      setProducerPriceDisplay("");
    }
    setErrors({});
  }, [open, mode, grade, variant]);

  function patch(partial: Partial<GradeInput>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  function syncPriceToday(display: string, unit: PriceUnit) {
    setPriceTodayDisplay(display);
    const amount = parsePriceInput(display);
    patch({
      priceTodayRsKg:
        amount == null ? (display.trim() === "" ? null : values.priceTodayRsKg) : String(toPricePerKg(amount, unit)),
    });
  }

  function syncProducerPrice(display: string, unit: PriceUnit) {
    setProducerPriceDisplay(display);
    const amount = parsePriceInput(display);
    patch({
      producerPriceRsKg:
        amount == null
          ? display.trim() === ""
            ? null
            : values.producerPriceRsKg
          : String(toPricePerKg(amount, unit)),
    });
  }

  function switchPriceUnit(next: PriceUnit) {
    if (next === priceUnit) return;
    const convert = (raw: string) => {
      const amount = parsePriceInput(raw);
      if (amount == null) return raw;
      // Current display is in `priceUnit`; convert number into `next`.
      const asKg = priceUnit === "KG" ? amount : kgFromMt(amount);
      return String(next === "KG" ? asKg : mtFromKg(asKg));
    };
    setPriceTodayDisplay((current) => convert(current));
    setProducerPriceDisplay((current) => convert(current));
    setPriceUnit(next);
  }

  function addApplications(raw: string) {
    const next = parseApplications(raw);
    if (next.length === 0) return;
    patch({ applications: Array.from(new Set([...values.applications, ...next])) });
    setAppDraft("");
  }

  function addFeatures(raw: string) {
    const next = parseApplications(raw);
    if (next.length === 0) return;
    patch({ features: Array.from(new Set([...(values.features ?? []), ...next])) });
    setFeatureDraft("");
  }

  function patchCatalog(partial: Partial<GradeInput["catalogSpecs"]>) {
    patch({ catalogSpecs: { ...(values.catalogSpecs ?? {}), ...partial } });
  }

  async function submit() {
    const todayAmount = parsePriceInput(priceTodayDisplay);
    const producerAmount = parsePriceInput(producerPriceDisplay);
    const normalized: GradeInput = {
      ...values,
      gradeCode: imported ? values.gradeCode : normalizeGradeCode(values.gradeCode),
      gradeName: values.gradeName.trim(),
      applications: values.applications,
      priceTodayRsKg:
        priceTodayDisplay.trim() === ""
          ? null
          : todayAmount == null
            ? values.priceTodayRsKg
            : String(toPricePerKg(todayAmount, priceUnit)),
      producerPriceRsKg:
        producerPriceDisplay.trim() === ""
          ? null
          : producerAmount == null
            ? values.producerPriceRsKg
            : String(toPricePerKg(producerAmount, priceUnit)),
      producerPriceType: values.producerPriceType?.trim() || null,
    };
    const nextErrors = validateGradeInput(normalized);
    const originalCode = grade?.gradeCode;
    const codeChanged = mode === "edit" && originalCode && originalCode !== normalized.gradeCode;
    if (
      existingCodes.includes(normalized.gradeCode) &&
      (mode === "create" || originalCode !== normalized.gradeCode)
    ) {
      nextErrors.gradeCode = "Grade code already exists.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (codeChanged && codeLocked) {
      setErrors({ gradeCode: "Unlock grade code to change it." });
      return;
    }
    setSaving(true);
    try {
      await onSave(normalized, { confirmCodeChange: Boolean(codeChanged) });
    } finally {
      setSaving(false);
    }
  }

  const fields = (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gradeCode">Grade Code *</Label>
          <Input
            id="gradeCode"
            value={values.gradeCode}
            disabled={mode === "edit" && codeLocked}
            onChange={(event) => patch({ gradeCode: event.target.value.toUpperCase() })}
            onBlur={() => patch({ gradeCode: normalizeGradeCode(values.gradeCode) })}
            placeholder="HDPE_FILM"
            className="font-mono"
          />
          {imported ? (
            <p className="text-[11px] text-muted-foreground">
              Managed by the Source.One import (code, category and grade group cannot be edited here).
            </p>
          ) : mode === "edit" ? (
            <button
              type="button"
              className="text-left text-[11px] font-medium text-primary"
              onClick={() => setCodeLocked((current) => !current)}
            >
              {codeLocked ? "Change grade code (requires confirmation)" : "Lock grade code"}
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground">Stable machine identifier. Spaces become underscores.</p>
          )}
          {errors.gradeCode ? <p className="text-xs text-red-600">{errors.gradeCode}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gradeName">{imported ? "Display Name *" : "Grade Name *"}</Label>
          <Input
            id="gradeName"
            value={values.gradeName}
            onChange={(event) => patch({ gradeName: event.target.value })}
            placeholder="HD Film"
          />
          {errors.gradeName ? <p className="text-xs text-red-600">{errors.gradeName}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Category *</Label>
          <Select
            value={values.categoryId || undefined}
            disabled={imported}
            onValueChange={(value) => patch({ categoryId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {getLiveCategories().map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                  <span className="text-muted-foreground"> · {category.parentGroup}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId ? <p className="text-xs text-red-600">{errors.categoryId}</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(event) => patch({ sortOrder: Number(event.target.value) })}
          />
          {errors.sortOrder ? <p className="text-xs text-red-600">{errors.sortOrder}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gradeGroup">Grade Group</Label>
          <Input
            id="gradeGroup"
            value={values.gradeGroup ?? ""}
            disabled={imported}
            onChange={(event) => patch({ gradeGroup: event.target.value })}
            placeholder="ABS EXTRUSION"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gradeNo">Grade No.</Label>
          <Input
            id="gradeNo"
            value={values.gradeNo ?? ""}
            disabled={imported}
            onChange={(event) => patch({ gradeNo: event.target.value })}
            placeholder="3000D"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input
            id="manufacturer"
            value={values.manufacturer ?? ""}
            disabled={imported}
            onChange={(event) => patch({ manufacturer: event.target.value })}
            placeholder="TAITA"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hsnCode">HSN Code</Label>
          <Input
            id="hsnCode"
            value={values.hsnCode ?? ""}
            onChange={(event) => patch({ hsnCode: event.target.value })}
            placeholder="3903.30.00"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullGradeName">Full Grade Name</Label>
        <Input
          id="fullGradeName"
          value={values.fullGradeName ?? ""}
          disabled={imported}
          onChange={(event) => patch({ fullGradeName: event.target.value })}
          placeholder="ABS EXTRUSION 3000D - TAITA"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={values.description ?? ""}
          onChange={(event) => patch({ description: event.target.value })}
          placeholder="High-density polyethylene film grade"
          rows={3}
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-3">
        <p className="mb-1 text-sm font-medium text-slate-900">Reference prices</p>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Delhi / producer list rates for Grade Master. Marketplace checkout uses the
          seller <span className="font-medium">Offer</span> selling price (₹/MT) — edit
          that under Commerce → Offers → Edit price / MT.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <PriceUnitField
            id="priceToday"
            label="Price Today"
            value={priceTodayDisplay}
            unit={priceUnit}
            onValueChange={(v) => syncPriceToday(v, priceUnit)}
            onUnitChange={switchPriceUnit}
            storageUnit="KG"
            hint="Leave blank if not on today's Delhi list."
            error={errors.priceTodayRsKg}
          />
          <PriceUnitField
            id="producerPrice"
            label="Producer Price"
            value={producerPriceDisplay}
            unit={priceUnit}
            onValueChange={(v) => syncProducerPrice(v, priceUnit)}
            onUnitChange={switchPriceUnit}
            storageUnit="KG"
            error={errors.producerPriceRsKg}
          />
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="producerPriceType">Producer price type</Label>
          <Input
            id="producerPriceType"
            value={values.producerPriceType ?? ""}
            onChange={(event) => patch({ producerPriceType: event.target.value })}
            placeholder="LIST / CONTRACT / …"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="applications">Applications</Label>
        <Input
          id="applications"
          value={appDraft}
          onChange={(event) => setAppDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addApplications(appDraft);
            }
          }}
          onBlur={() => addApplications(appDraft)}
          placeholder="Packaging, Film, Flexible Packaging"
        />
        <div className="flex flex-wrap gap-1.5">
          {values.applications.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded border bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-700"
              onClick={() => patch({ applications: values.applications.filter((app) => app !== item) })}
            >
              {item} ×
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="features">Product Features</Label>
        <Input
          id="features"
          value={featureDraft}
          onChange={(event) => setFeatureDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addFeatures(featureDraft);
            }
          }}
          onBlur={() => addFeatures(featureDraft)}
          placeholder="Virgin Material, IS Certified, Quality Assured"
        />
        <div className="flex flex-wrap gap-1.5">
          {(values.features ?? []).map((item) => (
            <button
              key={item}
              type="button"
              className="rounded border bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-700"
              onClick={() =>
                patch({ features: (values.features ?? []).filter((feature) => feature !== item) })
              }
            >
              {item} ×
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-3">
        <p className="mb-1 text-sm font-medium text-slate-900">Catalog specs</p>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Defaults for Seller listing prefill and Customer PDP when the offer leaves them blank.
          Seller packaging / MFI / density always win when set on the listing.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="catalogMfi">MFI</Label>
            <Input
              id="catalogMfi"
              value={values.catalogSpecs?.mfi ?? ""}
              onChange={(event) => patchCatalog({ mfi: event.target.value })}
              placeholder="3.0"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="catalogDensity">Density</Label>
            <Input
              id="catalogDensity"
              value={values.catalogSpecs?.density ?? ""}
              onChange={(event) => patchCatalog({ density: event.target.value })}
              placeholder="1.04"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="catalogCas">CAS Number</Label>
            <Input
              id="catalogCas"
              value={values.catalogSpecs?.casNumber ?? ""}
              onChange={(event) => patchCatalog({ casNumber: event.target.value })}
              placeholder="9003-56-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="catalogPackaging">Default Packaging</Label>
            <Input
              id="catalogPackaging"
              value={values.catalogSpecs?.defaultPackaging ?? ""}
              onChange={(event) => patchCatalog({ defaultPackaging: event.target.value })}
              placeholder="25 KG Bags"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={values.status} onValueChange={(value) => patch({ status: value as GradeStatus })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Customer Visible</p>
            <p className="text-[11px] text-muted-foreground">Blind marketplace browse</p>
          </div>
          <Switch checked={values.customerVisible} onCheckedChange={(checked) => patch({ customerVisible: checked })} />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Seller Visible</p>
            <p className="text-[11px] text-muted-foreground">Offer / inventory select</p>
          </div>
          <Switch checked={values.sellerVisible} onCheckedChange={(checked) => patch({ sellerVisible: checked })} />
        </div>
      </div>

      {mode === "edit" && !codeLocked ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Changing Grade Code can break Customer, Seller, PR, PO and order references. Save will ask for confirmation.
        </p>
      ) : null}

      <div className={cn("flex justify-end gap-2", variant === "drawer" && "border-t pt-4")}>
        {variant === "drawer" ? (
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" onClick={() => void submit()} disabled={saving}>
          {saving ? "Saving..." : mode === "create" ? "Save Grade" : "Save Changes"}
        </Button>
      </div>
    </div>
  );

  if (variant === "page") {
    return <div className="rounded-md border bg-white p-5 shadow-soft">{fields}</div>;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{mode === "create" ? "Add Grade" : "Edit Grade"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Define a tradable grade once. Customer and Seller apps consume this record."
              : "Update display, reference prices (₹/MT or ₹/kg), visibility and status. Grade code is a stable identifier."}
          </SheetDescription>
        </SheetHeader>
        <div className="px-5 py-4">{fields}</div>
      </SheetContent>
    </Sheet>
  );
}
