"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { type AdminAuditEntry, getImportDocumentUrl } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { ImportQuantityUnit, ImportShipmentStatus } from "@/types/import-trading";
import { toast } from "sonner";

export const IMPORT_BASE = "/import-trading";

const TABS = [
  { href: IMPORT_BASE, label: "Dashboard", exact: true },
  { href: `${IMPORT_BASE}/listings`, label: "Listings" },
  { href: `${IMPORT_BASE}/negotiations`, label: "Negotiations" },
  { href: `${IMPORT_BASE}/deals`, label: "Deals" },
  { href: `${IMPORT_BASE}/shipments`, label: "Shipments" },
  { href: `${IMPORT_BASE}/matches`, label: "Matches" },
  { href: `${IMPORT_BASE}/documents`, label: "Documents" },
  { href: `${IMPORT_BASE}/audit`, label: "Audit log" },
  { href: `${IMPORT_BASE}/master-data`, label: "Master data" },
  { href: `${IMPORT_BASE}/settings`, label: "Settings" },
];

export function ImportTradingTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Import trading sections" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ApiError || err instanceof Error) return err.message || fallback;
  return fallback;
}

export type FieldErrors = Record<string, string>;

/** Field-level errors from an Import `details` array, keyed by field. */
export function fieldErrorsOf(err: unknown): FieldErrors {
  if (!(err instanceof ApiError) || !Array.isArray(err.details)) return {};
  return Object.fromEntries(
    (err.details as Array<{ field?: unknown; message?: unknown }>)
      .filter((d) => typeof d.field === "string")
      .map((d) => [d.field as string, String(d.message ?? "Invalid value")]),
  );
}

/** Loads on mount and whenever `deps` change; `reload()` refetches. */
export function useLoader<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(errorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, error, loading, reload, setData };
}

const LABELS: Record<string, string> = {
  PENDING_CONFIRMATION: "Awaiting confirmation",
  OFFER_RECEIVED: "Offer received",
  DEAL_CONFIRMED: "Deal confirmed",
  PARTIALLY_FULFILLED: "Partially fulfilled",
  OPENED: "Offer sent",
  COUNTER: "Counteroffer",
  POL: "Port of loading",
  POD: "Port of discharge",
  SHIPMENT_WINDOW: "Shipment window",
  PAYMENT_TERMS: "Payment terms",
  QUALITY: "Quality & documents",
  FT_20: "20 ft",
  FT_40: "40 ft",
  BOOKED: "Shipment booked",
  SHIPPED: "Shipped / picked up",
  ARRIVED: "Arrived at destination port",
  SEA: "Sea",
  AIR: "Air",
  ROAD: "Road",
  RAIL: "Rail",
};

export function importLabel(value?: string | null): string {
  if (!value) return "—";
  if (LABELS[value]) return LABELS[value];
  if (/^[A-Z]{2,4}$/.test(value)) return value;
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

const TONE: Record<string, string> = {
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200",
  PUBLISHED: "bg-sky-50 text-sky-700 border-sky-200",
  MATCHING: "bg-sky-50 text-sky-700 border-sky-200",
  OFFER_RECEIVED: "bg-amber-50 text-amber-800 border-amber-200",
  NEGOTIATION: "bg-amber-50 text-amber-800 border-amber-200",
  MATCHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DEAL_CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PARTIALLY_FULFILLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FULFILLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAUSED: "bg-slate-50 text-slate-600 border-slate-200",
  EXPIRED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  OPEN: "bg-amber-50 text-amber-800 border-amber-200",
  AGREED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  WITHDRAWN: "bg-slate-50 text-slate-600 border-slate-200",
  PENDING_CONFIRMATION: "bg-amber-50 text-amber-800 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-slate-50 text-slate-600 border-slate-200",
  SUGGESTED: "bg-sky-50 text-sky-700 border-sky-200",
  NEGOTIATING: "bg-amber-50 text-amber-800 border-amber-200",
  CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DISMISSED: "bg-slate-50 text-slate-600 border-slate-200",
  STALE: "bg-slate-50 text-slate-600 border-slate-200",
  BUY: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SELL: "bg-teal-50 text-teal-700 border-teal-200",
};

/** Shipment statuses; CANCELLED is neutral here, unlike listings and deals. */
const SHIPMENT_TONE: Record<string, string> = {
  BOOKED: "bg-sky-50 text-sky-700 border-sky-200",
  SHIPPED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_TRANSIT: "bg-blue-50 text-blue-700 border-blue-200",
  ARRIVED: "bg-amber-50 text-amber-800 border-amber-200",
  CUSTOMS_CLEARANCE: "bg-amber-50 text-amber-800 border-amber-200",
  OUT_FOR_DELIVERY: "bg-amber-50 text-amber-800 border-amber-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  EXCEPTION: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-slate-50 text-slate-600 border-slate-200",
};

export function ImportBadge({
  value,
  kind,
  className,
}: {
  value: string;
  kind?: "shipment";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium",
        (kind === "shipment" ? SHIPMENT_TONE[value] : TONE[value]) ?? "bg-slate-50 text-slate-600 border-slate-200",
        className,
      )}
    >
      {value === "BUY" ? "Buy request" : value === "SELL" ? "Sell offer" : importLabel(value)}
    </span>
  );
}

/** Groups a decimal string without float rounding. */
export function formatDecimal(value?: string | null, maxFraction = 4): string {
  if (value === null || value === undefined || value === "") return "—";
  const [int = "", frac = ""] = value.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = frac.slice(0, maxFraction).replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

export function formatQty(value?: string | null, unit?: ImportQuantityUnit | string | null) {
  if (!value) return "—";
  return `${formatDecimal(value, 3)} ${unit ? importLabel(unit) : ""}`.trim();
}

/** Currency is always explicit; amounts in different currencies are never summed. */
export function formatPrice(
  value?: string | null,
  currencyCode?: string | null,
  unit?: ImportQuantityUnit | string | null,
) {
  if (!value) return "—";
  const [int = "", frac = ""] = value.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const amount = `${grouped}.${frac.slice(0, 4).replace(/0+$/, "").padEnd(2, "0")}`;
  return `${currencyCode ?? ""} ${amount}${unit ? ` / ${importLabel(unit)}` : ""}`.trim();
}

/** Date-only values (YYYY-MM-DD) are calendar dates and render in UTC. */
export function formatImportDate(value?: string | null) {
  if (!value) return "—";
  const dateOnly = value.length === 10;
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : undefined,
  });
}

export function portLabel(p?: { code: string; name: string } | null) {
  return p ? `${p.name} (${p.code})` : "—";
}

/** Import writes are ADMIN/SUPER_ADMIN only; other admin roles get a read-only console. */
export function useImportWriteAccess() {
  const role = useAuthStore((s) => s.user?.role);
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export const SHIPMENT_TERMINAL: readonly ImportShipmentStatus[] = ["DELIVERED", "CANCELLED"];

/** ETA is never estimated client-side. */
export function shipmentEta(eta?: string | null) {
  return eta ? formatDateTime(eta) : "ETA not available yet";
}

export function shipmentRoute(s: { originLocation: string | null; destinationLocation: string | null }) {
  if (!s.originLocation && !s.destinationLocation) return "—";
  return `${s.originLocation ?? "—"} → ${s.destinationLocation ?? "—"}`;
}

export function Section({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border bg-white p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="section-label">{title}</p>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function KeyValues({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-sm text-slate-900">
            {item.value === null || item.value === undefined || item.value === "" ? "—" : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function auditActionLabel(action: string) {
  return importLabel(action.replace(/^IMPORT_/, ""));
}

export function AuditTimeline({ entries }: { entries: AdminAuditEntry[] }) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">No audit entries.</p>;
  return (
    <ol className="space-y-2">
      {entries.map((a) => {
        const reason = a.metadata && typeof a.metadata.reason === "string" ? a.metadata.reason : null;
        const role = a.metadata && typeof a.metadata.actorRole === "string" ? a.metadata.actorRole : null;
        return (
          <li key={a.id} className="relative border-l border-slate-200 pl-4 text-sm">
            <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary" />
            <p className="font-medium">{auditActionLabel(a.action)}</p>
            <p className="text-xs text-muted-foreground">
              {a.actor?.name ?? "System"}
              {role ? ` (${importLabel(role)})` : ""} · {formatDateTime(a.createdAt)}
              {reason ? ` · “${reason}”` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** Preview opens inline in a new tab; both actions request a fresh signed URL. */
export function DocumentActions({ documentId }: { documentId: string }) {
  const [busy, setBusy] = useState<"inline" | "attachment" | null>(null);
  const open = async (disposition: "inline" | "attachment") => {
    // Opened synchronously so popup blockers allow it; "noopener" would make window.open return null.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setBusy(disposition);
    try {
      const { url } = await getImportDocumentUrl(documentId, disposition);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      tab?.close();
      toast.error(errorMessage(err, "Unable to open this document."));
    } finally {
      setBusy(null);
    }
  };
  return (
    <span className="inline-flex gap-1">
      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void open("inline")}>
        {busy === "inline" ? "Opening…" : "Preview"}
      </Button>
      <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void open("attachment")}>
        Download
      </Button>
    </span>
  );
}

/** Confirms an Admin action with an optional reason that is written to the audit log. */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          onOpenChange(next);
          if (!next) setReason("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={3}
          maxLength={500}
          placeholder="Reason (recorded in the audit log and shared with the participant)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(reason.trim());
                setReason("");
                onOpenChange(false);
              } catch {
                // The caller has reported the error; keep the dialog open to retry.
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
