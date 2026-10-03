"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import {
  searchSellers,
  sellerSetupUrl,
  type OneTimeLink,
  type PermissionDef,
  type PermissionPreset,
  type SellerOption,
} from "@/lib/api/users";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (!name) return "Full name is required";
  if (name.length < 2) return "Enter at least 2 characters";
  if (name.length > 120) return "Keep the name under 120 characters";
  return null;
}

export function validateEmail(value: string) {
  const email = value.trim();
  if (!email) return "Email is required";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address";
  return null;
}

/** Mirrors the backend: 10-digit Indian mobile starting 6-9, optional +91. */
export function validateMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!value.trim()) return "Mobile number is required";
  if (!/^[6-9]\d{9}$/.test(local)) return "Enter a valid 10-digit Indian mobile number";
  return null;
}

export function validatePassword(value: string) {
  if (value.length < 8 || value.length > 128) return "Use 8 to 128 characters";
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(value)) {
    return "Include uppercase, lowercase, and a number";
  }
  return null;
}

export function TextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function SellerPicker({
  value,
  onChange,
  excludeId,
}: {
  value: SellerOption | null;
  onChange: (seller: SellerOption) => void;
  excludeId?: string;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SellerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      setLoading(true);
      setFailed(false);
      void searchSellers(query, "APPROVED", controller.signal)
        .then((rows) => setOptions(rows.filter((row) => row.id !== excludeId)))
        .catch((error: unknown) => {
          if ((error as { name?: string })?.name === "AbortError") return;
          setOptions([]);
          setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [query, excludeId]);

  return (
    <div className="space-y-3">
      <TextField
        label="Search seller"
        value={query}
        onChange={setQuery}
        placeholder="Company name, legal name, email or phone"
        hint="Only approved sellers can be assigned a manager."
      />
      <ul className="max-h-60 space-y-1 overflow-auto" aria-busy={loading}>
        {loading && !options.length ? (
          <li className="px-1 py-2 text-xs text-slate-500">Searching sellers…</li>
        ) : null}
        {failed ? (
          <li className="px-1 py-2 text-xs text-red-600">Could not load sellers. Try again.</li>
        ) : null}
        {!loading && !failed && !options.length ? (
          <li className="px-1 py-2 text-xs text-slate-500">No approved sellers match this search.</li>
        ) : null}
        {options.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                value?.id === option.id
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200 hover:border-slate-400"
              }`}
              onClick={() => onChange(option)}
            >
              <span className="font-medium">{option.name}</span>
              <span className="block text-xs text-slate-500">
                Seller ID: {option.code || option.id.slice(0, 8)} · GST {option.gst || "—"} ·{" "}
                {humanize(option.status)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {value ? <SellerSummary seller={value} /> : null}
    </div>
  );
}

export function SellerSummary({ seller }: { seller: SellerOption }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3 text-sm">
      <p className="font-medium">{seller.name}</p>
      {seller.legalName && seller.legalName !== seller.name ? (
        <p className="text-xs text-slate-500">{seller.legalName}</p>
      ) : null}
      <p className="mt-1 text-xs text-slate-600">
        Seller ID: {seller.code || seller.id} · GST {seller.gst || "—"} · PAN {seller.pan || "—"} ·{" "}
        {humanize(seller.status)}
      </p>
    </div>
  );
}

export function groupPermissions(catalog: PermissionDef[]) {
  const map = new Map<string, PermissionDef[]>();
  for (const item of catalog) {
    const list = map.get(item.module) ?? [];
    list.push(item);
    map.set(item.module, list);
  }
  return [...map.entries()];
}

export function PermissionGrid({
  catalog,
  presets,
  value,
  onChange,
  onPreset,
}: {
  catalog: PermissionDef[];
  presets: PermissionPreset[];
  value: string[];
  onChange: (codes: string[]) => void;
  onPreset?: (preset: PermissionPreset) => void;
}) {
  const grouped = useMemo(() => groupPermissions(catalog), [catalog]);

  function toggle(code: string) {
    const next = value.includes(code) ? value.filter((item) => item !== code) : [...value, code];
    // A manage grant is useless without the matching view grant.
    if (!value.includes(code) && code.endsWith(".manage")) {
      const view = code.replace(/\.manage$/, ".view");
      if (catalog.some((item) => item.code === view) && !next.includes(view)) next.push(view);
    }
    onChange(next);
  }

  if (!catalog.length) {
    return <p className="text-sm text-slate-500">Loading permissions…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              onChange([...preset.permissions]);
              onPreset?.(preset);
            }}
          >
            {preset.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])}>
          Clear
        </Button>
      </div>
      <p className="text-xs text-slate-500">{value.length} permissions selected</p>
      {grouped.map(([module, items]) => (
        <div key={module} className="rounded-md border p-3">
          <p className="text-sm font-medium">{module}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <label key={item.code} className="flex items-start gap-2 text-xs">
                <Checkbox
                  className="mt-0.5"
                  checked={value.includes(item.code)}
                  onCheckedChange={() => toggle(item.code)}
                />
                <span>
                  <span className="font-medium text-slate-800">{item.action}</span>
                  {item.description ? (
                    <span className="block text-slate-500">{item.description}</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PermissionSummary({
  catalog,
  codes,
}: {
  catalog: PermissionDef[];
  codes: string[];
}) {
  const grouped = groupPermissions(catalog.filter((item) => codes.includes(item.code)));
  if (!grouped.length) return <span className="text-slate-500">None</span>;
  return (
    <ul className="space-y-1">
      {grouped.map(([module, items]) => (
        <li key={module}>
          <span className="font-medium">{module}:</span>{" "}
          <span className="text-slate-600">{items.map((item) => item.action).join(", ")}</span>
        </li>
      ))}
    </ul>
  );
}

export function OneTimeLinkPanel({
  link,
  title,
}: {
  link: OneTimeLink;
  title: string;
}) {
  const url = sellerSetupUrl(link.token);
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-amber-900">{link.message}</p>
      <p className="mt-2 break-all font-mono text-xs">{url}</p>
      <p className="mt-1 text-xs text-slate-600">Expires {formatDateTime(link.expiresAt)}</p>
      <Button
        className="mt-2"
        size="sm"
        variant="outline"
        type="button"
        onClick={() =>
          void navigator.clipboard
            .writeText(url)
            .then(() => toast.success("Link copied"))
            .catch(() => toast.error("Copy failed. Select the link and copy it manually."))
        }
      >
        Copy setup link
      </Button>
    </div>
  );
}

export function humanize(value?: string | null) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
