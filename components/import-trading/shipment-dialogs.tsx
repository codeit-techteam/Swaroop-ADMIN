"use client";

import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { errorMessage, type FieldErrors, fieldErrorsOf, importLabel } from "@/components/import-trading/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  addShipmentEvent,
  IMPORT_SHIPMENT_MODES,
  updateShipment,
} from "@/lib/api/import-trading";
import type {
  AdminImportShipment,
  AdminImportShipmentDetail,
  ImportShipmentDetailsInput,
  ImportShipmentMode,
  ImportShipmentStatus,
} from "@/types/import-trading";

/** `datetime-local` value in the browser's timezone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isConflict(err: unknown) {
  return err instanceof ApiError && err.status === 409;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const SELECT = "h-9 w-full rounded-md border bg-white px-2 text-sm";

export function AddTrackingUpdateDialog({
  shipment,
  onClose,
  onSaved,
  onConflict,
}: {
  shipment: AdminImportShipment;
  onClose: () => void;
  onSaved: (next: AdminImportShipmentDetail) => void;
  onConflict: () => void;
}) {
  const [status, setStatus] = useState<ImportShipmentStatus | "">("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => toLocalInput(new Date().toISOString()));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const transitions = shipment.allowedTransitions ?? [];

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (status === "EXCEPTION" && !description.trim()) {
      next.description = "Describe the exception so the buyer and Admin know what happened.";
    }
    if (!status && !location.trim() && !description.trim()) {
      next.description = "Add a location or note, or choose a new status.";
    }
    if (occurredAt && new Date(occurredAt).getTime() > Date.now()) {
      next.occurredAt = "Tracking events cannot be dated in the future.";
    }
    return next;
  };

  const submit = async () => {
    const local = validate();
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const next = await addShipmentEvent(shipment.id, {
        status: status || undefined,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
      });
      toast.success(
        status ? `${shipment.referenceNumber} is now ${importLabel(status).toLowerCase()}` : "Tracking update added",
      );
      onSaved(next);
      onClose();
    } catch (err) {
      const fields = fieldErrorsOf(err);
      setErrors(fields);
      if (isConflict(err)) {
        toast.error(errorMessage(err, "This shipment changed; the latest version has been loaded."));
        onConflict();
        onClose();
      } else if (!Object.keys(fields).length) {
        toast.error(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add tracking update</DialogTitle>
          <DialogDescription>
            Recorded on {shipment.referenceNumber} and shared with the buyer and seller. Status changes follow the
            shipment lifecycle.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field id="ev-status" label="Status" error={errors.status}>
            <select
              id="ev-status"
              className={SELECT}
              value={status}
              onChange={(e) => setStatus(e.target.value as ImportShipmentStatus | "")}
            >
              <option value="">No status change (note / location only)</option>
              {transitions.map((s) => (
                <option key={s} value={s}>
                  {importLabel(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field id="ev-location" label="Location" error={errors.location}>
            <Input
              id="ev-location"
              maxLength={160}
              placeholder="e.g. Nhava Sheva (INNSA)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
          <Field
            id="ev-description"
            label={status === "EXCEPTION" ? "Description (required)" : "Description"}
            error={errors.description}
          >
            <Textarea
              id="ev-description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field
            id="ev-occurred"
            label="Occurred at"
            error={errors.occurredAt}
            hint="Defaults to now; cannot be in the future."
          >
            <Input
              id="ev-occurred"
              type="datetime-local"
              max={toLocalInput(new Date().toISOString())}
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={status === "CANCELLED" || status === "EXCEPTION" ? "destructive" : "default"}
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? "Saving…" : "Save update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DetailForm = {
  mode: ImportShipmentMode;
  carrierName: string;
  trackingNumber: string;
  vesselName: string;
  voyageNumber: string;
  containerNumbers: string;
  originLocation: string;
  destinationLocation: string;
  etd: string;
  eta: string;
  remarks: string;
};

function formOf(s: AdminImportShipment): DetailForm {
  return {
    mode: s.mode,
    carrierName: s.carrierName ?? "",
    trackingNumber: s.trackingNumber ?? "",
    vesselName: s.vesselName ?? "",
    voyageNumber: s.voyageNumber ?? "",
    containerNumbers: s.containerNumbers.join(", "),
    originLocation: s.originLocation ?? "",
    destinationLocation: s.destinationLocation ?? "",
    etd: toLocalInput(s.etd),
    eta: toLocalInput(s.eta),
    remarks: s.remarks ?? "",
  };
}

function parseContainers(value: string) {
  return value
    .split(/[\s,]+/)
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

export function EditShipmentDialog({
  shipment,
  onClose,
  onSaved,
  onConflict,
}: {
  shipment: AdminImportShipment;
  onClose: () => void;
  onSaved: (next: AdminImportShipmentDetail) => void;
  onConflict: () => void;
}) {
  const [initial] = useState(() => formOf(shipment));
  const [form, setForm] = useState<DetailForm>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof DetailForm>(key: K, value: DetailForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** Only edited fields are sent so untouched timestamps keep their full precision. */
  const changes = (): ImportShipmentDetailsInput => {
    const patch: ImportShipmentDetailsInput = {};
    const text = ["carrierName", "trackingNumber", "vesselName", "voyageNumber", "originLocation", "destinationLocation", "remarks"] as const;
    if (form.mode !== initial.mode) patch.mode = form.mode;
    for (const key of text) {
      if (form[key].trim() !== initial[key].trim()) patch[key] = form[key].trim() || null;
    }
    if (parseContainers(form.containerNumbers).join(",") !== parseContainers(initial.containerNumbers).join(",")) {
      patch.containerNumbers = parseContainers(form.containerNumbers);
    }
    for (const key of ["etd", "eta"] as const) {
      if (form[key] !== initial[key]) patch[key] = form[key] ? new Date(form[key]).toISOString() : null;
    }
    return patch;
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (form.etd && form.eta && new Date(form.eta).getTime() < new Date(form.etd).getTime()) {
      next.eta = "Estimated arrival cannot be before estimated departure.";
    }
    if (parseContainers(form.containerNumbers).some((c) => c.length > 20)) {
      next.containerNumbers = "Container numbers can be at most 20 characters each.";
    }
    return next;
  };

  const submit = async () => {
    const local = validate();
    setErrors(local);
    if (Object.keys(local).length) return;
    const patch = changes();
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      const next = await updateShipment(shipment.id, { ...patch, version: shipment.version });
      toast.success(`${shipment.referenceNumber} updated`);
      onSaved(next);
      onClose();
    } catch (err) {
      const fields = fieldErrorsOf(err);
      setErrors(fields);
      if (isConflict(err)) {
        toast.error(
          err instanceof ApiError && err.code === "IMPORT_DRAFT_CONFLICT"
            ? "Someone else updated this shipment. The latest details have been loaded; please re-apply your changes."
            : errorMessage(err),
        );
        onConflict();
        onClose();
      } else if (!Object.keys(fields).length) {
        toast.error(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const text = (key: keyof Omit<DetailForm, "mode">, label: string, maxLength: number, placeholder?: string) => (
    <Field id={`sh-${key}`} label={label} error={errors[key]}>
      <Input
        id={`sh-${key}`}
        maxLength={maxLength}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit shipment details</DialogTitle>
          <DialogDescription>
            Carrier, routing and schedule for {shipment.referenceNumber}. Quantity and status cannot be changed here.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="sh-mode" label="Mode" error={errors.mode}>
            <select
              id="sh-mode"
              className={SELECT}
              value={form.mode}
              onChange={(e) => set("mode", e.target.value as ImportShipmentMode)}
            >
              {IMPORT_SHIPMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {importLabel(m)}
                </option>
              ))}
            </select>
          </Field>
          {text("carrierName", "Carrier", 120, "e.g. Maersk")}
          {text("trackingNumber", "Tracking no. (B/L, AWB or LR)", 80)}
          {text("vesselName", "Vessel", 120)}
          {text("voyageNumber", "Voyage", 40)}
          <Field
            id="sh-containerNumbers"
            label="Container numbers"
            error={errors.containerNumbers}
            hint="Separate with commas or spaces."
          >
            <Input
              id="sh-containerNumbers"
              value={form.containerNumbers}
              onChange={(e) => set("containerNumbers", e.target.value)}
            />
          </Field>
          {text("originLocation", "Origin", 160)}
          {text("destinationLocation", "Destination", 160)}
          <Field id="sh-etd" label="ETD" error={errors.etd}>
            <Input id="sh-etd" type="datetime-local" value={form.etd} onChange={(e) => set("etd", e.target.value)} />
          </Field>
          <Field id="sh-eta" label="ETA" error={errors.eta} hint="Leave empty when unknown.">
            <Input
              id="sh-eta"
              type="datetime-local"
              min={form.etd || undefined}
              value={form.eta}
              onChange={(e) => set("eta", e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="sh-remarks" label="Remarks" error={errors.remarks}>
              <Textarea
                id="sh-remarks"
                rows={3}
                maxLength={2000}
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void submit()}>
            {busy ? "Saving…" : "Save details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
