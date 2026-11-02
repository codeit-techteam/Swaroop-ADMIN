"use client";

import { useEffect, useState } from "react";

import { PriceUnitField } from "@/components/shared/price-unit-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatInr,
  parsePriceInput,
  toPricePerMt,
  type PriceUnit,
} from "@/lib/price-units";
import type { Offer } from "@/types";

interface EditOfferPriceDialogProps {
  open: boolean;
  offer: Offer | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: {
    pricePerMt?: number;
    pricePerKg?: number;
    reason: string;
  }) => Promise<void>;
}

export function EditOfferPriceDialog({
  open,
  offer,
  onOpenChange,
  onSubmit,
}: EditOfferPriceDialogProps) {
  const [unit, setUnit] = useState<PriceUnit>("MT");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !offer) return;
    setUnit("MT");
    setValue(String(offer.price || ""));
    setReason("");
    setError(null);
  }, [open, offer]);

  if (!offer) return null;

  const amount = parsePriceInput(value);
  const previewMt = amount == null ? null : toPricePerMt(amount, unit);
  const freightDominates = previewMt != null && previewMt > 0 && previewMt < 1250;

  const submit = async () => {
    if (amount == null) {
      setError("Enter a positive material price.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Add a short audit reason (min 5 characters).");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(
        unit === "MT"
          ? { pricePerMt: amount, reason: reason.trim() }
          : { pricePerKg: amount, reason: reason.trim() },
      );
      onOpenChange(false);
    } catch {
      // Caller shows toast; keep dialog open for retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit material price</DialogTitle>
          <DialogDescription>
            Sets the marketplace selling price for{" "}
            <span className="font-medium text-foreground">{offer.grade}</span>. Stored
            as ₹/MT on the offer (1 MT = 1,000 kg). Checkout still adds freight + GST
            on top of this material price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Current: ₹{formatInr(offer.price, 0)} / MT
            {offer.needsPriceReview ? (
              <span className="mt-1 block text-amber-700">
                {offer.priceReviewReason ??
                  "Flagged for price review — material looks unusually low vs freight."}
              </span>
            ) : null}
          </div>

          <PriceUnitField
            id="offer-price"
            label="Material selling price"
            value={value}
            unit={unit}
            onValueChange={setValue}
            onUnitChange={setUnit}
            storageUnit="MT"
            hint="Typical polymer range is roughly ₹80–150 / kg (₹80,000–1,50,000 / MT)."
          />

          {freightDominates ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              At ₹{formatInr(previewMt!, 2)} / MT, platform freight (~₹1,250 / MT) will
              dominate the order total — the same pattern as ₹10/MT → ~₹14,862 for 10 MT.
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-price-reason">Reason *</Label>
            <Textarea
              id="offer-price-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Corrected test listing to Delhi market rate"
              rows={3}
            />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? "Saving..." : "Save price"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
