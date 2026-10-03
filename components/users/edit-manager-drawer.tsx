"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/api/client";
import {
  getPermissionCatalog,
  updateManager,
  type ManagerDetail,
  type PermissionCatalog,
  type SellerOption,
} from "@/lib/api/users";

import {
  PermissionGrid,
  SellerPicker,
  SellerSummary,
  TextField,
  validateMobile,
  validateName,
} from "./manager-fields";

export type EditSection = "profile" | "permissions" | "seller";

const TITLES: Record<EditSection, string> = {
  profile: "Edit manager",
  permissions: "Change permissions",
  seller: "Change seller assignment",
};

export function EditManagerDrawer({
  manager,
  section,
  onOpenChange,
  onSaved,
}: {
  manager: ManagerDetail;
  section: EditSection | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (next: ManagerDetail) => void;
}) {
  const [name, setName] = useState(manager.name);
  const [phone, setPhone] = useState(manager.phone ?? "");
  const [title, setTitle] = useState(manager.assignment?.title ?? "");
  const [permissions, setPermissions] = useState<string[]>(manager.permissions);
  const [seller, setSeller] = useState<SellerOption | null>(null);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!section) return;
    setName(manager.name);
    setPhone(manager.phone ?? "");
    setTitle(manager.assignment?.title ?? "");
    setPermissions(manager.permissions);
    setSeller(null);
    setErrors({});
  }, [section, manager]);

  useEffect(() => {
    if (section !== "permissions" || catalog) return;
    void getPermissionCatalog()
      .then((result) => setCatalog(result.data))
      .catch(() => toast.error("Could not load the permission catalog"));
  }, [section, catalog]);

  async function save() {
    if (!section || busy) return;
    const body: Record<string, unknown> = {};
    const found: Record<string, string> = {};
    if (section === "profile") {
      const nameError = validateName(name);
      const phoneError = validateMobile(phone);
      if (nameError) found.name = nameError;
      if (phoneError) found.phone = phoneError;
      if (name.trim() !== manager.name) body.name = name.trim();
      if (phone.trim() !== (manager.phone ?? "")) body.phone = phone.trim();
      if (title.trim() !== (manager.assignment?.title ?? "")) body.title = title.trim();
    }
    if (section === "permissions") {
      if (!permissions.length) found.permissions = "Select at least one permission";
      body.permissions = permissions;
    }
    if (section === "seller") {
      if (!seller) found.seller = "Select the new seller";
      else body.sellerId = seller.id;
    }
    setErrors(found);
    if (Object.keys(found).length) return;
    if (!Object.keys(body).length) {
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      const result = await updateManager(manager.id, body);
      toast.success(
        section === "seller"
          ? "Seller reassigned. The manager was signed out of all sessions."
          : "Manager updated",
      );
      onSaved(result.data);
      onOpenChange(false);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const message = apiError?.message ?? "Update failed";
      if (apiError?.code === "MOBILE_ALREADY_EXISTS" || apiError?.code === "INVALID_MOBILE") {
        setErrors({ phone: message });
      } else if (apiError?.code?.startsWith("SELLER_")) {
        setErrors({ seller: message });
      } else if (apiError?.code === "INVALID_PERMISSIONS") {
        setErrors({ permissions: message });
      }
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={Boolean(section)} onOpenChange={(open) => !busy && onOpenChange(open)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{section ? TITLES[section] : ""}</SheetTitle>
          <SheetDescription>
            {section === "seller"
              ? "The manager loses access to the current seller immediately and must sign in again."
              : section === "permissions"
                ? "Changes apply to the manager's next request. The backend checks permissions on every call."
                : "Email is the account identity and cannot be changed here."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {section === "profile" ? (
            <>
              <TextField label="Full name" value={name} onChange={setName} error={errors.name} />
              <TextField label="Mobile number" value={phone} onChange={setPhone} error={errors.phone} />
              <TextField label="Title" value={title} onChange={setTitle} />
            </>
          ) : null}
          {section === "permissions" ? (
            <>
              <PermissionGrid
                catalog={catalog?.permissions ?? []}
                presets={catalog?.presets ?? []}
                value={permissions}
                onChange={setPermissions}
              />
              {errors.permissions ? (
                <p className="text-xs text-red-600">{errors.permissions}</p>
              ) : null}
            </>
          ) : null}
          {section === "seller" ? (
            <>
              {manager.seller ? (
                <div className="space-y-1 text-sm">
                  <p className="text-slate-500">Current seller</p>
                  <SellerSummary seller={manager.seller} />
                </div>
              ) : null}
              <SellerPicker
                value={seller}
                onChange={setSeller}
                excludeId={
                  manager.assignment?.status === "ACTIVE" ? manager.seller?.id : undefined
                }
              />
              {errors.seller ? <p className="text-xs text-red-600">{errors.seller}</p> : null}
            </>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={section === "seller" ? "destructive" : "default"}
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : section === "seller" ? "Reassign seller" : "Save changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
