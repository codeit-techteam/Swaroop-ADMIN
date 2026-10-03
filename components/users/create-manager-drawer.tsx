"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  type CreatedManager,
  type PermissionCatalog,
  type SellerOption,
} from "@/lib/api/users";

import {
  OneTimeLinkPanel,
  PermissionGrid,
  PermissionSummary,
  SellerPicker,
  SellerSummary,
  TextField,
  humanize,
  validateEmail,
  validateMobile,
  validateName,
  validatePassword,
} from "./manager-fields";

const STEPS = [
  "Personal Details",
  "Seller Assignment",
  "Permissions",
  "Login Access",
  "Review",
];

type FieldErrors = Partial<
  Record<"name" | "email" | "phone" | "seller" | "permissions" | "password", string>
>;

/** Backend error codes mapped to the step and field that can fix them. */
const ERROR_TARGETS: Record<string, { step: number; field: keyof FieldErrors }> = {
  EMAIL_ALREADY_EXISTS: { step: 0, field: "email" },
  MOBILE_ALREADY_EXISTS: { step: 0, field: "phone" },
  INVALID_MOBILE: { step: 0, field: "phone" },
  SELLER_NOT_FOUND: { step: 1, field: "seller" },
  SELLER_NOT_ACTIVE: { step: 1, field: "seller" },
  INVALID_PERMISSIONS: { step: 2, field: "permissions" },
  WEAK_PASSWORD: { step: 3, field: "password" },
};

export function CreateManagerDrawer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [seller, setSeller] = useState<SellerOption | null>(null);
  const [isPrimary, setIsPrimary] = useState(true);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [accessMethod, setAccessMethod] = useState<"INVITATION" | "TEMPORARY_PASSWORD">(
    "INVITATION",
  );
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [created, setCreated] = useState<CreatedManager | null>(null);

  useEffect(() => {
    if (!open || catalog) return;
    setCatalogError(false);
    void getPermissionCatalog()
      .then((result) => {
        setCatalog(result.data);
        const preset = result.data.presets.find((p) => p.id === result.data.defaultPreset);
        if (preset) {
          setPermissions((current) => (current.length ? current : [...preset.permissions]));
          setTitle((current) => current || preset.label);
        }
      })
      .catch(() => setCatalogError(true));
  }, [open, catalog]);

  function reset() {
    setStep(0);
    setName("");
    setEmail("");
    setPhone("");
    setSeller(null);
    setIsPrimary(true);
    setPermissions([]);
    setTitle("");
    setAccessMethod("INVITATION");
    setTemporaryPassword("");
    setErrors({});
    setSubmitError(null);
    setCreated(null);
    setCatalog(null);
  }

  function validate(target: number): FieldErrors {
    if (target === 0) {
      const next: FieldErrors = {};
      const nameError = validateName(name);
      const emailError = validateEmail(email);
      const phoneError = validateMobile(phone);
      if (nameError) next.name = nameError;
      if (emailError) next.email = emailError;
      if (phoneError) next.phone = phoneError;
      return next;
    }
    if (target === 1 && !seller) return { seller: "Select the seller this manager will operate" };
    if (target === 2 && !permissions.length) {
      return { permissions: "Select at least one permission" };
    }
    if (target === 3 && accessMethod === "TEMPORARY_PASSWORD") {
      const passwordError = validatePassword(temporaryPassword);
      if (passwordError) return { password: passwordError };
    }
    return {};
  }

  function next() {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSubmitError(null);
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }

  async function submit() {
    if (submitting.current || !seller) return;
    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const found = validate(index);
      if (Object.keys(found).length) {
        setErrors(found);
        setStep(index);
        return;
      }
    }
    submitting.current = true;
    setBusy(true);
    setSubmitError(null);
    try {
      const result = await createManager({
        name: name.trim().replace(/\s+/g, " "),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        sellerId: seller.id,
        role: "SELLER_MANAGER",
        permissions,
        accessMethod,
        temporaryPassword: accessMethod === "TEMPORARY_PASSWORD" ? temporaryPassword : undefined,
        isPrimary,
        title: title.trim() || undefined,
      });
      setTemporaryPassword("");
      setCreated(result.data);
      onCreated();
      toast.success("Seller Manager created successfully");
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const target = apiError?.code ? ERROR_TARGETS[apiError.code] : undefined;
      const message =
        apiError?.status === 403
          ? "You do not have permission to create Seller Managers."
          : apiError?.message ?? "Could not create the Seller Manager. Try again.";
      if (target) {
        setErrors({ [target.field]: message });
        setStep(target.step);
      } else {
        setSubmitError(message);
      }
      toast.error(message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
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
          <CreatedPanel
            created={created}
            catalog={catalog}
            onView={() => {
              onOpenChange(false);
              reset();
              router.push(`/users/${created.id}`);
            }}
            onClose={() => {
              onOpenChange(false);
              reset();
            }}
          />
        ) : (
          <div className="mt-6 space-y-5">
            <ol className="flex flex-wrap gap-2 text-xs">
              {STEPS.map((label, index) => (
                <li
                  key={label}
                  className={
                    index === step
                      ? "rounded-full bg-slate-900 px-2 py-1 text-white"
                      : index < step
                        ? "rounded-full bg-slate-200 px-2 py-1 text-slate-700"
                        : "rounded-full bg-slate-100 px-2 py-1 text-slate-500"
                  }
                >
                  {index + 1}. {label}
                </li>
              ))}
            </ol>

            {step === 0 ? (
              <div className="space-y-3">
                <TextField
                  label="Full name"
                  value={name}
                  onChange={setName}
                  error={errors.name}
                  autoComplete="off"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  error={errors.email}
                  autoComplete="off"
                />
                <TextField
                  label="Mobile number"
                  value={phone}
                  onChange={setPhone}
                  error={errors.phone}
                  placeholder="10-digit Indian mobile"
                  autoComplete="off"
                />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-3">
                <SellerPicker
                  value={seller}
                  onChange={(option) => {
                    setSeller(option);
                    setErrors({});
                  }}
                />
                {errors.seller ? <p className="text-xs text-red-600">{errors.seller}</p> : null}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={isPrimary}
                    onCheckedChange={(value) => setIsPrimary(value === true)}
                  />
                  Set as primary account manager
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Role: Seller Manager</p>
                <TextField
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  placeholder="e.g. Operations Manager"
                />
                {catalogError ? (
                  <div className="space-y-2 text-sm text-red-600">
                    <p>Could not load the permission catalog.</p>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCatalog(null)}>
                      Retry
                    </Button>
                  </div>
                ) : (
                  <PermissionGrid
                    catalog={catalog?.permissions ?? []}
                    presets={catalog?.presets ?? []}
                    value={permissions}
                    onChange={(codes) => {
                      setPermissions(codes);
                      setErrors({});
                    }}
                    onPreset={(preset) => setTitle(preset.label)}
                  />
                )}
                {errors.permissions ? (
                  <p className="text-xs text-red-600">{errors.permissions}</p>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    className="mt-1"
                    checked={accessMethod === "INVITATION"}
                    onChange={() => setAccessMethod("INVITATION")}
                  />
                  <span>
                    <span className="font-medium">Invitation link (recommended)</span>
                    <span className="block text-xs text-slate-500">
                      A one-time setup link valid for {catalog?.invitationTtlHours ?? 72} hours. The
                      manager sets their own password, then signs in to the Seller panel.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    className="mt-1"
                    checked={accessMethod === "TEMPORARY_PASSWORD"}
                    onChange={() => setAccessMethod("TEMPORARY_PASSWORD")}
                  />
                  <span>
                    <span className="font-medium">Temporary password</span>
                    <span className="block text-xs text-slate-500">
                      You set it now and share it securely. The manager must change it at first
                      sign-in. It is stored only as a hash and never shown again.
                    </span>
                  </span>
                </label>
                {accessMethod === "TEMPORARY_PASSWORD" ? (
                  <TextField
                    label="Temporary password"
                    type="password"
                    value={temporaryPassword}
                    onChange={setTemporaryPassword}
                    error={errors.password}
                    autoComplete="new-password"
                    hint="8+ characters with uppercase, lowercase, and a number."
                  />
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <dl className="space-y-2 text-sm">
                <Row label="Full name" value={name.trim()} />
                <Row label="Email" value={email.trim().toLowerCase()} />
                <Row label="Mobile" value={phone.trim()} />
                <Row label="Role" value="Seller Manager" />
                <Row label="Title" value={title || "Seller Manager"} />
                <div>
                  <dt className="mb-1 text-slate-500">Assigned seller</dt>
                  <dd>{seller ? <SellerSummary seller={seller} /> : "—"}</dd>
                </div>
                <Row label="Primary manager" value={isPrimary ? "Yes" : "No"} />
                <div>
                  <dt className="mb-1 text-slate-500">Permissions ({permissions.length})</dt>
                  <dd className="text-xs">
                    <PermissionSummary catalog={catalog?.permissions ?? []} codes={permissions} />
                  </dd>
                </div>
                <Row
                  label="Login access"
                  value={
                    accessMethod === "INVITATION"
                      ? "Invitation required"
                      : "Temporary password (change required)"
                  }
                />
                <Row
                  label="Account status after creation"
                  value={accessMethod === "INVITATION" ? "Pending until invitation is accepted" : "Active"}
                />
              </dl>
            ) : null}

            {submitError ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {submitError}
              </p>
            ) : null}

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0 || busy}
                onClick={() => {
                  setErrors({});
                  setStep((value) => value - 1);
                }}
              >
                Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next}>
                  Continue
                </Button>
              ) : (
                <Button type="button" disabled={busy} onClick={() => void submit()}>
                  {busy ? "Creating Seller Manager…" : "Create Seller Manager"}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CreatedPanel({
  created,
  catalog,
  onView,
  onClose,
}: {
  created: CreatedManager;
  catalog: PermissionCatalog | null;
  onView: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-6 space-y-3 text-sm">
      <p className="text-base font-semibold">Seller Manager created successfully.</p>
      <dl className="space-y-2">
        <Row label="Name" value={created.name} />
        <Row label="Email" value={created.email} />
        <Row label="Login ID" value={created.loginId} />
        <Row label="Assigned seller" value={created.seller.name} />
        <Row label="Role" value="Seller Manager" />
        <Row label="Account status" value={humanize(created.status)} />
        <div>
          <dt className="mb-1 text-slate-500">Permissions</dt>
          <dd className="text-xs">
            <PermissionSummary catalog={catalog?.permissions ?? []} codes={created.permissions} />
          </dd>
        </div>
      </dl>
      {created.invitation ? (
        <OneTimeLinkPanel
          link={created.invitation}
          title={`Invitation prepared for ${created.invitation.email} (not sent automatically)`}
        />
      ) : (
        <p className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
          The manager signs in with Login ID {created.loginId} and the temporary password you set,
          and must change it at first sign-in. Share it through a secure channel.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onView}>
          View manager
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            void navigator.clipboard
              .writeText(created.loginId ?? "")
              .then(() => toast.success("Login ID copied"))
          }
        >
          Copy Login ID
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
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
