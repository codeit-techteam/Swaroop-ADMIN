"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { AdminKycSlot } from "@/types";

const PRESETS = [
  "The uploaded copy is blurred or unreadable. Please upload a clear scan of the original.",
  "Name on the document does not match the registered business name.",
  "Document has expired. Please upload a currently valid copy.",
  "GSTIN / PAN entered does not match the uploaded certificate. Correct the details and resubmit.",
];

interface RequestChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityName: string;
  audience: "seller" | "customer";
  slots: AdminKycSlot[];
  /** Pre-selects this document when opened from a document row. */
  initialDocumentId?: string | null;
  onSubmit: (reason: string, documentIds: string[]) => Promise<void>;
}

export function RequestChangesDialog({
  open,
  onOpenChange,
  entityName,
  audience,
  slots,
  initialDocumentId,
  onSubmit,
}: RequestChangesDialogProps) {
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setSelected(initialDocumentId ? [initialDocumentId] : []);
  }, [open, initialDocumentId]);

  const missing = useMemo(
    () => slots.filter((slot) => slot.required && !slot.document).map((slot) => slot.name),
    [slots],
  );
  const trimmed = reason.trim();
  const invalid = trimmed.length < 5;

  const toggle = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));

  const submit = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await onSubmit(trimmed, selected);
      onOpenChange(false);
    } catch {
      // onSubmit reports its own error; keep the dialog open so the admin can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request changes from {entityName}</DialogTitle>
          <DialogDescription>
            The {audience} is notified in the {audience === "seller" ? "Seller App and Seller Web" : "Customer App and Customer Web"}{" "}
            with your note. Selected documents are marked rejected and must be re-uploaded before they can resubmit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label>Documents to re-upload</Label>
          <ul className="divide-y rounded-md border">
            {slots.map((slot) => {
              const doc = slot.document;
              const verified = doc?.status === "Verified";
              const alreadyRejected = doc?.status === "Rejected";
              const id = `rc-${slot.slot}`;
              return (
                <li key={slot.slot} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox
                    id={id}
                    disabled={!doc || verified}
                    checked={Boolean(doc && selected.includes(doc.id))}
                    onCheckedChange={(checked) => doc && toggle(doc.id, checked === true)}
                  />
                  <label htmlFor={id} className="flex-1 text-sm">
                    <span className="font-medium text-slate-800">{slot.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {!doc
                        ? slot.required
                          ? "Not uploaded — the note will ask for it"
                          : "Optional · not uploaded"
                        : verified
                          ? "Already verified — cannot be sent back"
                          : alreadyRejected
                            ? `Rejected: ${doc.rejectionReason ?? "awaiting re-upload"}`
                            : doc.fileName}
                    </span>
                  </label>
                  {doc ? <StatusBadge value={doc.status} /> : null}
                </li>
              );
            })}
          </ul>
          {missing.length ? (
            <p className="text-xs text-amber-700">Missing required: {missing.join(", ")}.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
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

        <div className="grid gap-1.5">
          <Label htmlFor="request-changes-reason">What needs to change? (required)</Label>
          <Textarea
            id="request-changes-reason"
            rows={4}
            maxLength={2000}
            value={reason}
            placeholder={`Shown to the ${audience} exactly as written`}
            onChange={(event) => setReason(event.target.value)}
          />
          {reason && invalid ? (
            <p className="text-xs text-destructive">Please describe the change in a few words.</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || invalid} onClick={() => void submit()}>
            {busy
              ? "Sending…"
              : selected.length
                ? `Request changes (${selected.length} document${selected.length > 1 ? "s" : ""})`
                : "Request changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
