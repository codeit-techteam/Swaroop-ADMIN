"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreditInsurancePayload } from "@/lib/api/credit";

export function CreditInsuranceDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  defaults,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  defaults?: { insurancePartner?: string | null; insuranceReference?: string | null; insuredAmount?: string | null };
  onConfirm: (payload: CreditInsurancePayload) => void;
}) {
  const [partner, setPartner] = useState(defaults?.insurancePartner ?? "");
  const [reference, setReference] = useState(defaults?.insuranceReference ?? "");
  const [insuredAmount, setInsuredAmount] = useState(defaults?.insuredAmount ?? "");
  const [customerMessage, setCustomerMessage] = useState("");
  const [notes, setNotes] = useState("");

  const partnerDefault = defaults?.insurancePartner ?? "";
  const referenceDefault = defaults?.insuranceReference ?? "";
  const amountDefault = defaults?.insuredAmount ?? "";

  // Prefill from the application each time the dialog opens so admins only edit deltas.
  useEffect(() => {
    if (!open) return;
    setPartner(partnerDefault);
    setReference(referenceDefault);
    setInsuredAmount(amountDefault);
    setCustomerMessage("");
    setNotes("");
  }, [open, partnerDefault, referenceDefault, amountDefault]);

  const reset = () => {
    setPartner(partnerDefault);
    setReference(referenceDefault);
    setInsuredAmount(amountDefault);
    setCustomerMessage("");
    setNotes("");
  };

  const extra: ReactNode = (
    <div className="space-y-3 px-1">
      <div className="space-y-1.5">
        <Label htmlFor="credit-insurance-partner">Insurance partner</Label>
        <Input
          id="credit-insurance-partner"
          value={partner}
          onChange={(event) => setPartner(event.target.value)}
          placeholder="ICICI Lombard"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="credit-insurance-reference">Reference / policy number</Label>
        <Input
          id="credit-insurance-reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="REF-99213"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="credit-insured-amount">Insured amount (INR)</Label>
        <Input
          id="credit-insured-amount"
          type="number"
          min="0"
          step="0.01"
          value={insuredAmount}
          onChange={(event) => setInsuredAmount(event.target.value)}
          placeholder="2500000"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="credit-customer-message">Customer message</Label>
        <Textarea
          id="credit-customer-message"
          value={customerMessage}
          onChange={(event) => setCustomerMessage(event.target.value)}
          placeholder="Shown to the customer on their application timeline"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="credit-internal-notes">Internal notes</Label>
        <Textarea
          id="credit-internal-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Not shown to the customer"
        />
      </div>
    </div>
  );

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      extra={extra}
      onConfirm={() => {
        const parsedAmount = insuredAmount ? Number(insuredAmount) : undefined;
        if (parsedAmount != null && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) return;
        onConfirm({
          insurancePartner: partner.trim() || undefined,
          insuranceReference: reference.trim() || undefined,
          insuredAmount: parsedAmount,
          customerMessage: customerMessage.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        reset();
      }}
    />
  );
}
