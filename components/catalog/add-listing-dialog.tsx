"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SellerPicker } from "@/components/users/manager-fields";
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
import { createAdminListing } from "@/lib/api/products";
import { listGrades } from "@/lib/api/grades";
import type { SellerOption } from "@/lib/api/users";
import {
  DEFAULT_GRADE_SORT,
  EMPTY_GRADE_FILTERS,
  type Grade,
} from "@/types/grade";

const MARKETPLACE_FREIGHT_FLOOR_PER_MT = 1250;

function listingCodeFromGrade(grade: Grade): string {
  const base = (grade.gradeCode || grade.gradeNo || "LISTING")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${base}-${suffix}`.slice(0, 48);
}

function listingNameFromGrade(grade: Grade): string {
  return (
    grade.fullGradeName?.trim() ||
    grade.gradeName?.trim() ||
    grade.gradeCode
  );
}

export function AddListingDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [seller, setSeller] = useState<SellerOption | null>(null);
  const [gradeQuery, setGradeQuery] = useState("");
  const [gradeOptions, setGradeOptions] = useState<Grade[]>([]);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [warehouseName, setWarehouseName] = useState("Kolkata");
  const [availableStock, setAvailableStock] = useState("10");
  const [moq, setMoq] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("94500");
  const [mfi, setMfi] = useState("");
  const [application, setApplication] = useState("");
  const [notes, setNotes] = useState("");
  const [publish, setPublish] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSeller(null);
    setGradeQuery("");
    setGradeOptions([]);
    setSelectedGrade(null);
    setCode("");
    setName("");
    setWarehouseName("Kolkata");
    setAvailableStock("10");
    setMoq("1");
    setSellingPrice("94500");
    setMfi("");
    setApplication("");
    setNotes("");
    setPublish(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = gradeQuery.trim();
    if (q.length < 2) {
      setGradeOptions([]);
      return;
    }
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      setGradeLoading(true);
      void listGrades(
        {
          ...EMPTY_GRADE_FILTERS,
          search: q,
          status: "ACTIVE",
          customerVisible: "VISIBLE",
        },
        DEFAULT_GRADE_SORT,
        1,
        12,
      )
        .then(({ grades }) => {
          if (!controller.signal.aborted) setGradeOptions(grades);
        })
        .catch(() => {
          if (!controller.signal.aborted) setGradeOptions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setGradeLoading(false);
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [gradeQuery, open]);

  const priceNum = Number(sellingPrice) || 0;
  const stockNum = Number(availableStock) || 0;
  const moqNum = Number(moq) || 0;
  const priceBelowFloor =
    priceNum > 0 && priceNum < MARKETPLACE_FREIGHT_FLOOR_PER_MT;

  const canSubmit = useMemo(() => {
    if (!seller?.organizationId || !selectedGrade) return false;
    if (!code.trim() || !name.trim()) return false;
    if (stockNum <= 0 || moqNum <= 0 || moqNum > stockNum) return false;
    if (priceNum <= 0) return false;
    if (publish && priceBelowFloor) return false;
    return true;
  }, [
    seller,
    selectedGrade,
    code,
    name,
    stockNum,
    moqNum,
    priceNum,
    publish,
    priceBelowFloor,
  ]);

  const pickGrade = (grade: Grade) => {
    setSelectedGrade(grade);
    setCode(listingCodeFromGrade(grade));
    setName(listingNameFromGrade(grade));
    setMfi(grade.catalogSpecs?.mfi?.trim() || "");
    setApplication(
      Array.isArray(grade.applications) && grade.applications.length
        ? String(grade.applications[0])
        : "",
    );
  };

  const submit = async () => {
    if (!canSubmit || !seller?.organizationId || !selectedGrade) return;
    setSubmitting(true);
    try {
      const result = await createAdminListing({
        organizationId: seller.organizationId,
        gradeId: selectedGrade.id,
        code: code.trim(),
        name: name.trim(),
        manufacturer: selectedGrade.manufacturer || undefined,
        mfi: mfi.trim() || undefined,
        packaging: selectedGrade.catalogSpecs?.defaultPackaging || undefined,
        unit: "MT",
        countryOfOrigin: "India",
        application: application.trim() || undefined,
        polymerType: selectedGrade.categoryName || undefined,
        warehouseName: warehouseName.trim() || undefined,
        availableStock: stockNum,
        moq: moqNum,
        sellingPrice: priceNum,
        publishToMarketplace: publish,
        notes: notes.trim() || undefined,
        gstPercent: 18,
      });
      toast.success(
        result.published
          ? "Listing live — visible on Customer App and Web marketplace"
          : "Draft listing saved (not published)",
      );
      onOpenChange(false);
      onCreated();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create listing.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add marketplace listing</DialogTitle>
          <DialogDescription>
            Creates a seller product with stock and an ACTIVE marketplace offer.
            Published listings appear in Catalog and Customer App / Web Live
            Listings (price must be ≥ ₹
            {MARKETPLACE_FREIGHT_FLOOR_PER_MT.toLocaleString("en-IN")}/MT).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <section className="space-y-2">
            <Label>Seller</Label>
            <SellerPicker value={seller} onChange={setSeller} />
            {seller && !seller.organizationId ? (
              <p className="text-xs text-red-600">
                This seller row is missing organizationId — refresh sellers and
                try again.
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <Label htmlFor="grade-search">Grade Master</Label>
            <Input
              id="grade-search"
              value={gradeQuery}
              onChange={(e) => setGradeQuery(e.target.value)}
              placeholder="Search grade code, name, manufacturer…"
            />
            {selectedGrade ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-medium text-slate-900">
                  {listingNameFromGrade(selectedGrade)}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedGrade.gradeCode}
                  {selectedGrade.manufacturer
                    ? ` · ${selectedGrade.manufacturer}`
                    : ""}
                  {selectedGrade.customerVisible
                    ? " · Customer visible"
                    : " · Hidden from customers"}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs"
                  onClick={() => setSelectedGrade(null)}
                >
                  Change grade
                </Button>
              </div>
            ) : (
              <ul className="max-h-40 space-y-1 overflow-auto rounded-md border border-slate-200 p-1">
                {gradeLoading ? (
                  <li className="px-2 py-2 text-xs text-slate-500">
                    Searching grades…
                  </li>
                ) : null}
                {!gradeLoading && gradeQuery.trim().length < 2 ? (
                  <li className="px-2 py-2 text-xs text-slate-500">
                    Type at least 2 characters to search Grade Master.
                  </li>
                ) : null}
                {!gradeLoading &&
                gradeQuery.trim().length >= 2 &&
                !gradeOptions.length ? (
                  <li className="px-2 py-2 text-xs text-slate-500">
                    No ACTIVE customer-visible grades match.
                  </li>
                ) : null}
                {gradeOptions.map((grade) => (
                  <li key={grade.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => pickGrade(grade)}
                    >
                      <span className="font-medium">
                        {listingNameFromGrade(grade)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {grade.gradeCode}
                        {grade.manufacturer ? ` · ${grade.manufacturer}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="listing-name">Listing name</Label>
              <Input
                id="listing-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-sku">SKU / listing code</Label>
              <Input
                id="listing-sku"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-stock">Available stock (MT)</Label>
              <Input
                id="listing-stock"
                type="number"
                min={0.001}
                step="0.001"
                value={availableStock}
                onChange={(e) => setAvailableStock(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-moq">MOQ (MT)</Label>
              <Input
                id="listing-moq"
                type="number"
                min={0.001}
                step="0.001"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-price">Selling price (₹/MT)</Label>
              <Input
                id="listing-price"
                type="number"
                min={0.01}
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
              {priceBelowFloor ? (
                <p className="text-xs text-amber-700">
                  Below platform freight (₹
                  {MARKETPLACE_FREIGHT_FLOOR_PER_MT.toLocaleString("en-IN")}
                  /MT). Publishing is blocked — Customer App/Web would hide this
                  offer.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Use a realistic polymer ₹/MT (e.g. 90,000+), not a test amount
                  like ₹140.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-warehouse">Warehouse</Label>
              <Input
                id="listing-warehouse"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                placeholder="Kolkata"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-mfi">MFI (optional)</Label>
              <Input
                id="listing-mfi"
                value={mfi}
                onChange={(e) => setMfi(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listing-app">Application (optional)</Label>
              <Input
                id="listing-app"
                value={application}
                onChange={(e) => setApplication(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="listing-notes">Notes (optional)</Label>
            <Textarea
              id="listing-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
            />
            <span>
              Publish to Customer App and Web Live Listings now
              <span className="block text-xs text-slate-500">
                Uncheck to save as DRAFT (Catalog may hide it under Active only).
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit || submitting}
          >
            {submitting
              ? "Creating…"
              : publish
                ? "Add listing & publish"
                : "Save draft listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
