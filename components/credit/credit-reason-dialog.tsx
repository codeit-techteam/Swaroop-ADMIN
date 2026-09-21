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
  onConfirm: (input: { reason: string; amount?: number }) => void;
}) {
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");

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
      <div className="space-y-1.5">
        <Label htmlFor="credit-reason">Reason</Label>
        <Textarea
          id="credit-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Required for audit"
        />
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
        if (reason.trim().length < 3) return;
        onConfirm({ reason: reason.trim(), amount: parsed });
        setReason("");
        setAmount("");
      }}
    />
  );
}
