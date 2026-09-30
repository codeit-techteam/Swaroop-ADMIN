"use client";

import { useEffect, useState } from "react";

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

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  presets?: string[];
  /** When false an empty note is allowed (approvals). */
  required?: boolean;
  destructive?: boolean;
  placeholder?: string;
  onSubmit: (reason: string) => Promise<void>;
}

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  presets = [],
  required = true,
  destructive,
  placeholder = "Visible to the seller",
  onSubmit,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const trimmed = reason.trim();
  const invalid = required && trimmed.length < 5;

  const submit = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } catch {
      // onSubmit reports its own error; keep the dialog open so the admin can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {presets.length ? (
          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant="outline"
                className="h-auto whitespace-normal py-1 text-left text-xs"
                onClick={() => setReason(preset)}
              >
                {preset}
              </Button>
            ))}
          </div>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor="review-reason">
            {required ? "Reason (required)" : "Notes (optional)"}
          </Label>
          <Textarea
            id="review-reason"
            rows={4}
            maxLength={2000}
            value={reason}
            placeholder={placeholder}
            onChange={(event) => setReason(event.target.value)}
          />
          {required && reason && invalid ? (
            <p className="text-xs text-destructive">Please describe the reason in a few words.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={busy || invalid}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
