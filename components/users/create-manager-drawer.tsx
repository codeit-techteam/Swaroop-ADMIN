"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/api/client";
import {
  createManager,
  getPermissionCatalog,
  searchSellers,
  type CreatedManager,
  type PermissionDef,
  type PermissionPreset,
  type SellerOption,
} from "@/lib/api/users";

const STEPS = [
  "Personal Details",
  "Seller Assignment",
  "Permissions",
  "Login Access",
  "Review",
];

export function CreateManagerDrawer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sellerQuery, setSellerQuery] = useState("");
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [seller, setSeller] = useState<SellerOption | null>(null);
  const [catalog, setCatalog] = useState<PermissionDef[]>([]);
  const [presets, setPresets] = useState<PermissionPreset[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [accessMethod, setAccessMethod] = useState<"INVITATION" | "TEMPORARY_PASSWORD">("INVITATION");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedManager | null>(null);

  useEffect(() => {
    if (!open) return;
    void getPermissionCatalog()
      .then((result) => {
        setCatalog(result.data.permissions);
        setPresets(result.data.presets);
      })
      .catch(() => toast.error("Could not load permission catalog"));
  }, [open]);

  useEffect(() => {
    if (!open || step !== 1) return;
    const handle = window.setTimeout(() => {
      void searchSellers(sellerQuery)
        .then(setSellers)
        .catch(() => setSellers([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, sellerQuery, step]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDef[]>();
    for (const item of catalog) {
      const list = map.get(item.module) ?? [];
      list.push(item);
      map.set(item.module, list);
    }
    return [...map.entries()];
  }, [catalog]);

  function reset() {
    setStep(0);
    setName("");
    setEmail("");
    setPhone("");
    setSeller(null);
    setPermissions([]);
    setCreated(null);
    setTemporaryPassword("");
    setAccessMethod("INVITATION");
    setIsPrimary(true);
    setTitle("");
  }

  function toggle(code: string) {
    setPermissions((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    );
  }

  async function submit() {
    if (!seller) return;
    setBusy(true);
    try {
      const result = await createManager({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        sellerId: seller.id,
        role: "SELLER_MANAGER",
        permissions,
        accessMethod,
        temporaryPassword:
          accessMethod === "TEMPORARY_PASSWORD" ? temporaryPassword : undefined,
        isPrimary,
        title: title || undefined,
      });
      setCreated(result.data);
      onCreated();
      toast.success("Seller Manager created");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not create manager",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Create Seller Manager</SheetTitle>
          <SheetDescription>
            The manager is a user assigned to one seller. They are not a new seller account.
          </SheetDescription>
        </SheetHeader>
        {created ? (
          <CreatedPanel created={created} />
        ) : (
          <div className="mt-6 space-y-5">
            <ol className="flex flex-wrap gap-2 text-xs">
              {STEPS.map((label, index) => (
                <li
                  key={label}
                  className={
                    index === step
                      ? "rounded-full bg-slate-900 px-2 py-1 text-white"
                      : "rounded-full bg-slate-100 px-2 py-1 text-slate-600"
                  }
                >
                  {index + 1}. {label}
                </li>
              ))}
            </ol>
            {step === 0 ? (
              <div className="space-y-3">
                <Field label="Full name" value={name} onChange={setName} />
                <Field label="Email" value={email} onChange={setEmail} type="email" />
                <Field label="Mobile number" value={phone} onChange={setPhone} />
              </div>
            ) : null}
            {step === 1 ? (
              <div className="space-y-3">
                <Field label="Search seller" value={sellerQuery} onChange={setSellerQuery} placeholder="Search seller..." />
                <ul className="max-h-56 space-y-1 overflow-auto">
                  {sellers.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        className={`w-full rounded-md border px-3 py-2 text-left text-sm ${seller?.id === option.id ? "border-slate-900 bg-slate-50" : "border-slate-200"}`}
                        onClick={() => setSeller(option)}
                      >
                        <span className="font-medium">{option.name}</span>
                        <span className="block text-xs text-slate-500">
                          {option.gst || "GST —"} · {option.pan || "PAN —"} · {option.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {seller ? (
                  <div className="rounded-md border bg-slate-50 p-3 text-sm">
                    <p className="font-medium">{seller.name}</p>
                    <p>Seller ID: {seller.id}</p>
                    <p>GST: {seller.gst || "—"}</p>
                    <p>PAN: {seller.pan || "—"}</p>
                    <p>Status: {seller.status}</p>
                  </div>
                ) : null}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={isPrimary} onCheckedChange={(value) => setIsPrimary(value === true)} />
                  Set as primary account manager
                </label>
              </div>
            ) : null}
            {step === 2 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Role: Seller Manager</p>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPermissions(preset.permissions);
                        setTitle(preset.label);
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                {grouped.map(([module, items]) => (
                  <div key={module} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{module}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {items.map((item) => (
                        <label key={item.code} className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={permissions.includes(item.code)}
                            onCheckedChange={() => toggle(item.code)}
                          />
                          {item.action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {step === 3 ? (
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={accessMethod === "INVITATION"}
                    onChange={() => setAccessMethod("INVITATION")}
                  />
                  Send a one-time password setup link
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={accessMethod === "TEMPORARY_PASSWORD"}
                    onChange={() => setAccessMethod("TEMPORARY_PASSWORD")}
                  />
                  Set a temporary password (shown once, change required)
                </label>
                {accessMethod === "TEMPORARY_PASSWORD" ? (
                  <Field
                    label="Temporary password"
                    value={temporaryPassword}
                    onChange={setTemporaryPassword}
                    type="password"
                  />
                ) : (
                  <p className="text-slate-500">
                    The setup token is shown once after creation. Passwords are never emailed.
                  </p>
                )}
              </div>
            ) : null}
            {step === 4 ? (
              <dl className="space-y-2 text-sm">
                <Row label="Name" value={name} />
                <Row label="Email" value={email} />
                <Row label="Phone" value={phone} />
                <Row label="Seller" value={seller?.name} />
                <Row label="Role" value="Seller Manager" />
                <Row label="Title" value={title || "Seller Manager"} />
                <Row label="Permissions" value={`${permissions.length} selected`} />
                <Row label="Login method" value={accessMethod === "INVITATION" ? "Invitation" : "Temporary password"} />
              </dl>
            ) : null}
            <div className="flex justify-between">
              <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
                Back
              </Button>
              {step < 4 ? (
                <Button
                  type="button"
                  disabled={!canContinue(step, { name, email, phone, seller, permissions, accessMethod, temporaryPassword })}
                  onClick={() => setStep((value) => value + 1)}
                >
                  Continue
                </Button>
              ) : (
                <Button type="button" disabled={busy} onClick={() => void submit()}>
                  {busy ? "Creating…" : "Create Manager"}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CreatedPanel({ created }: { created: CreatedManager }) {
  const sellerOrigin =
    process.env.NEXT_PUBLIC_SELLER_APP_URL ?? "http://localhost:3003";
  const setupUrl = created.invitation
    ? `${sellerOrigin}/accept-invite?token=${created.invitation.token}`
    : "";
  return (
    <div className="mt-6 space-y-3 text-sm">
      <p className="text-base font-semibold">Manager created successfully</p>
      <Row label="Name" value={created.name} />
      <Row label="Login ID" value={created.loginId} />
      <Row label="Seller" value={created.seller.name} />
      <Row label="Role" value="Seller Manager" />
      <Row label="Status" value={created.status} />
      {created.invitation ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p>Invitation prepared for {created.invitation.email}.</p>
          <p className="mt-2 break-all font-mono text-xs">{setupUrl}</p>
          <p className="mt-2 text-xs">{created.invitation.message}</p>
          <Button
            className="mt-2"
            size="sm"
            variant="outline"
            type="button"
            onClick={() => void navigator.clipboard.writeText(setupUrl)}
          >
            Copy setup link
          </Button>
        </div>
      ) : null}
      {created.temporaryPassword ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p>Temporary password: {created.temporaryPassword}</p>
          <p className="mt-1 text-xs">This password will not be shown again.</p>
          <Button
            className="mt-2"
            size="sm"
            variant="outline"
            type="button"
            onClick={() => void navigator.clipboard.writeText(created.temporaryPassword ?? "")}
          >
            Copy temporary password
          </Button>
        </div>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        type="button"
        onClick={() => void navigator.clipboard.writeText(created.loginId ?? "")}
      >
        Copy Login ID
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}

function canContinue(
  step: number,
  values: {
    name: string;
    email: string;
    phone: string;
    seller: SellerOption | null;
    permissions: string[];
    accessMethod: string;
    temporaryPassword: string;
  },
) {
  if (step === 0) {
    return values.name.trim().length > 1 && values.email.includes("@") && values.phone.replace(/\D/g, "").length >= 10;
  }
  if (step === 1) return Boolean(values.seller);
  if (step === 2) return values.permissions.length > 0;
  if (step === 3 && values.accessMethod === "TEMPORARY_PASSWORD") {
    return values.temporaryPassword.length >= 8;
  }
  return true;
}
