"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Search, Upload } from "lucide-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  replaceTdsDocument,
  searchProductsForTds,
  uploadTdsDocument,
  type AdminProductOption,
  type TdsDocument,
} from "@/lib/api/tds";
import { cn } from "@/lib/utils";

const ACCEPTED =
  ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";

/** Derive product search hints from TDS filenames like ABS_EXTRUSION_SR101_TDS.pdf */
export function searchHintsFromFileName(fileName: string): string {
  return fileName
    .replace(/\.(pdf|png|jpe?g|webp)$/i, "")
    .replace(/[_\-/]+/g, " ")
    .replace(/\b(TDS|TECHNICAL|DATA|SHEET|DOCUMENT)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type PresetGrade = {
  gradeId: string;
  gradeName?: string | null;
  gradeCode?: string | null;
  productId?: string | null;
  productName?: string | null;
  productCode?: string | null;
  manufacturer?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, replaces the existing document file. */
  replaceDocument?: TdsDocument | null;
  /** Prefill grade/product when fulfilling a TDS request. */
  presetGrade?: PresetGrade | null;
  onDone: (doc: TdsDocument) => void;
};

export function TdsUploadDialog({
  open,
  onOpenChange,
  replaceDocument,
  presetGrade,
  onDone,
}: Props) {
  const isReplace = Boolean(replaceDocument?.id);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<AdminProductOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AdminProductOption | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [approveNow, setApproveNow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoMatched, setAutoMatched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery(presetGrade?.productName ?? "");
    setFile(null);
    setNotes("");
    setApproveNow(true);
    setSubmitting(false);
    setAutoMatched(false);
    if (replaceDocument?.linkedProducts?.[0]) {
      const p = replaceDocument.linkedProducts[0];
      setSelected({
        id: p.id,
        name: p.name,
        code: p.code ?? "",
        manufacturer: replaceDocument.producerName,
        gradeId: replaceDocument.gradeId,
        gradeName: replaceDocument.grade?.name ?? null,
        gradeCode: replaceDocument.grade?.code ?? null,
      });
    } else if (presetGrade?.gradeId) {
      setSelected({
        id: presetGrade.productId ?? `grade:${presetGrade.gradeId}`,
        name:
          presetGrade.productName ??
          presetGrade.gradeName ??
          presetGrade.gradeCode ??
          "Selected grade",
        code: presetGrade.productCode ?? presetGrade.gradeCode ?? "",
        manufacturer: presetGrade.manufacturer ?? null,
        gradeId: presetGrade.gradeId,
        gradeName: presetGrade.gradeName ?? null,
        gradeCode: presetGrade.gradeCode ?? null,
      });
    } else {
      setSelected(null);
    }
  }, [open, replaceDocument, presetGrade]);

  useEffect(() => {
    if (!open || isReplace) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setSearching(true);
      void searchProductsForTds(query, 30)
        .then((rows) => {
          if (cancelled) return;
          setProducts(rows);
          // Auto-select when filename search yields a single grade-linked hit.
          if (
            file &&
            !selected &&
            rows.filter((r) => r.gradeId).length === 1
          ) {
            const only = rows.find((r) => r.gradeId)!;
            setSelected(only);
            setAutoMatched(true);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            toast.error(
              error instanceof Error ? error.message : "Product search failed",
            );
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, isReplace, file, selected]);

  const canSubmit = useMemo(() => {
    if (!file) return false;
    if (isReplace) return true;
    return Boolean(selected?.gradeId || presetGrade?.gradeId);
  }, [file, isReplace, selected, presetGrade]);

  const onFileChange = (next: File | null) => {
    setFile(next);
    setAutoMatched(false);
    if (!next || isReplace || presetGrade?.gradeId) return;
    const hint = searchHintsFromFileName(next.name);
    if (hint) {
      setQuery(hint);
      setSelected(null);
    }
  };

  const submit = async () => {
    if (!file) {
      toast.error("Choose a PDF or image file");
      return;
    }
    if (!isReplace && !selected?.gradeId && !presetGrade?.gradeId) {
      toast.error("Select a marketplace product linked to a grade");
      return;
    }
    setSubmitting(true);
    try {
      const productId =
        selected?.id && !selected.id.startsWith("grade:")
          ? selected.id
          : (presetGrade?.productId ?? undefined);
      const payload = {
        file,
        productId,
        gradeId:
          selected?.gradeId ??
          presetGrade?.gradeId ??
          replaceDocument?.gradeId ??
          undefined,
        notes: notes.trim() || undefined,
        approveNow,
      };
      const saved =
        isReplace && replaceDocument
          ? await replaceTdsDocument(replaceDocument.id, payload)
          : await uploadTdsDocument(payload);
      toast.success(
        approveNow
          ? "TDS published — visible to customers and sellers"
          : "TDS uploaded — pending review",
      );
      onDone(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReplace
              ? "Replace TDS file"
              : presetGrade
                ? "Upload TDS to fulfill request"
                : "Upload TDS for product"}
          </DialogTitle>
          <DialogDescription>
            {isReplace
              ? "Upload a new revision. Approve now to publish immediately to customer and seller apps."
              : presetGrade
                ? "Attach a PDF/image TDS for this grade and publish it across Customer and Seller apps."
                : "Drop the TDS file first — we match marketplace products from the filename (grade / producer). Confirm the product, then publish."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tds-file">1. TDS file (PDF or image)</Label>
            <Input
              id="tds-file"
              type="file"
              accept={ACCEPTED}
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5 shrink-0" />
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tip: names like ABS_EXTRUSION_SR101_TDS.pdf help auto-match SR101
                products.
              </p>
            )}
          </div>

          {!isReplace ? (
            <div className="space-y-2">
              <Label htmlFor="tds-product-search">2. Match marketplace product</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="tds-product-search"
                  className="pl-8"
                  placeholder="Product name, grade no, producer, or paste filename…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setAutoMatched(false);
                  }}
                />
              </div>
              {autoMatched && selected ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                  Auto-matched from filename →{" "}
                  <span className="font-medium">{selected.name}</span>
                  {selected.gradeName ? ` (${selected.gradeName})` : ""}. Change
                  below if wrong.
                </p>
              ) : null}
              <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200">
                {searching ? (
                  <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Matching
                    products…
                  </p>
                ) : products.length === 0 ? (
                  <div className="space-y-1 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-slate-700">No products found</p>
                    <p className="text-xs leading-relaxed">
                      Try the grade number only (e.g. <span className="font-mono">SR101</span>{" "}
                      or <span className="font-mono">RS670</span>), or the product
                      display name. Products without a linked grade cannot receive
                      library TDS.
                    </p>
                  </div>
                ) : (
                  products.map((p) => {
                    const active = selected?.id === p.id;
                    const disabled = !p.gradeId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelected(p);
                          setAutoMatched(false);
                        }}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-0",
                          active ? "bg-sky-50 ring-1 ring-inset ring-sky-200" : "hover:bg-slate-50",
                          disabled && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <span className="font-medium text-slate-900">
                          {p.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {p.code}
                          {p.manufacturer ? ` · ${p.manufacturer}` : ""}
                          {p.gradeName
                            ? ` · Grade ${p.gradeName}`
                            : " · No grade linked"}
                          {p.gradeCode ? ` · ${p.gradeCode}` : ""}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              {selected?.gradeId ? (
                <p className="text-xs text-slate-600">
                  Selected:{" "}
                  <span className="font-medium text-slate-900">
                    {selected.name}
                  </span>
                  {selected.gradeName ? ` → ${selected.gradeName}` : ""}
                </p>
              ) : selected && !selected.gradeId ? (
                <p className="text-xs text-amber-700">
                  This product has no grade link — pick another product or link
                  the grade in Catalog first.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p className="font-medium text-slate-900">
                {replaceDocument?.documentTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {replaceDocument?.productName ??
                  replaceDocument?.grade?.name ??
                  replaceDocument?.gradeCode}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tds-notes">Internal notes (optional)</Label>
            <Textarea
              id="tds-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Source, revision notes, verification comments…"
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={approveNow}
              onCheckedChange={(v) => setApproveNow(v === true)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-slate-900">
                Publish immediately
              </span>
              <span className="block text-xs text-muted-foreground">
                Marks the TDS verified so it appears on Customer App, Customer
                WebApp, Seller App, and Seller WebApp for this product/grade.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || submitting}
            onClick={() => void submit()}
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {isReplace ? "Replace file" : "Upload & publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
