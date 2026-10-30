"use client";

import { useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreditReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  amountLabel,
  amountRequired,
  creditTermDaysLabel,
  defaultCreditTermDays = 30,
  reasonLabel = "Reason",
  reasonPlaceholder = "Required for audit",
  minReasonLength = 3,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  amountLabel?: string;
  amountRequired?: boolean;
  /** When set, shows Net-15 / Net-30 tenure selector for approval. */
  creditTermDaysLabel?: string;
  defaultCreditTermDays?: 15 | 30;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minReasonLength?: number;
  onConfirm: (input: {
    reason: string;
    amount?: number;
    creditTermDays?: number;
  }) => void;
}) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [creditTermDays, setCreditTermDays] = useState<15 | 30>(defaultCreditTermDays);

  const extra: ReactNode = (
    <div className="space-y-3 px-1">
      {amountLabel ? (
        <div className="space-y-1.5">
          <Label htmlFor="credit-amount">{amountLabel}</Label>
          <Input
            id="credit-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="5000000"
          />
        </div>
      ) : null}
      {creditTermDaysLabel ? (
        <div className="space-y-1.5">
          <Label htmlFor="credit-term-days">{creditTermDaysLabel}</Label>
          <select
            id="credit-term-days"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={creditTermDays}
            onChange={(event) =>
              setCreditTermDays(Number(event.target.value) === 15 ? 15 : 30)
            }
          >
            <option value={15}>Credit 15 Days (Net-15)</option>
            <option value={30}>Credit 30 Days (Net-30)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Customers see these tenures on products that support credit; this sets the approved facility term.
          </p>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="credit-reason">{reasonLabel}</Label>
        <Textarea
          id="credit-reason"
          value={reason}
          maxLength={2000}
          onChange={(event) => setReason(event.target.value)}
          placeholder={reasonPlaceholder}
        />
        {minReasonLength > 1 ? (
          <p className="text-xs text-muted-foreground">At least {minReasonLength} characters.</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason("");
          setAmount("");
          setCreditTermDays(defaultCreditTermDays);
        }
        onOpenChange(next);
      }}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      destructive={destructive}
      extra={extra}
      onConfirm={() => {
        const parsed = amount ? Number(amount) : undefined;
        if (amountRequired && (parsed == null || !Number.isFinite(parsed) || parsed < 0)) return;
        if (reason.trim().length < minReasonLength) return;
        onConfirm({
          reason: reason.trim(),
          amount: parsed,
          creditTermDays: creditTermDaysLabel ? creditTermDays : undefined,
        });
        setReason("");
        setAmount("");
        setCreditTermDays(defaultCreditTermDays);
      }}
    />
  );
}
