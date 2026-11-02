"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";

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

  useEffect(() => {
    if (!open) return;
    setQuery(presetGrade?.productName ?? "");
    setFile(null);
    setNotes("");
    setApproveNow(true);
    setSubmitting(false);
    if (replaceDocument?.linkedProducts?.[0]) {
      const p = replaceDocument.linkedProducts[0];
      setSelected({
        id: p.id,
        name: p.name,
        code: p.code,
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
    } else if (replaceDocument?.gradeId) {
      setSelected(null);
    } else {
      setSelected(null);
    }
  }, [open, replaceDocument, presetGrade]);

  useEffect(() => {
    if (!open || isReplace) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setSearching(true);
      void searchProductsForTds(query, 25)
        .then((rows) => {
          if (!cancelled) setProducts(rows);
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
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query, isReplace]);

  const canSubmit = useMemo(() => {
    if (!file) return false;
    if (isReplace) return true;
    return Boolean(selected?.gradeId || presetGrade?.gradeId);
  }, [file, isReplace, selected, presetGrade]);

  const submit = async () => {
    if (!file) {
      toast.error("Choose a PDF or image file");
      return;
    }
    if (!isReplace && !selected?.gradeId && !presetGrade?.gradeId) {
      toast.error("Select a product that is linked to a grade");
      return;
    }
    setSubmitting(true);
    try {
      const productId =
        selected?.id && !selected.id.startsWith("grade:")
          ? selected.id
          : presetGrade?.productId ?? undefined;
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
      const saved = isReplace && replaceDocument
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
                ? "Attach a PDF/image TDS for this grade and publish it to Customer App, Customer WebApp, and Seller panels."
                : "Pick a marketplace product, attach a PDF/image TDS, and optionally publish it immediately. The document title syncs to the product name."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isReplace ? (
            <div className="space-y-2">
              <Label htmlFor="tds-product-search">Product</Label>
              <Input
                id="tds-product-search"
                placeholder="Search by product name or code…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200">
                {searching ? (
                  <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Searching…
                  </p>
                ) : products.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No products found.
                  </p>
                ) : (
                  products.map((p) => {
                    const active = selected?.id === p.id;
                    const disabled = !p.gradeId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelected(p)}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-0",
                          active ? "bg-slate-100" : "hover:bg-slate-50",
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
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              {selected ? (
                <p className="text-xs text-slate-600">
                  Selected: <span className="font-medium">{selected.name}</span>
                  {selected.gradeName ? ` → ${selected.gradeName}` : ""}
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
            <Label htmlFor="tds-file">TDS file (PDF or image)</Label>
            <Input
              id="tds-file"
              type="file"
              accept={ACCEPTED}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <p className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            ) : null}
          </div>

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
          <Button disabled={!canSubmit || submitting} onClick={() => void submit()}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {isReplace ? "Replace file" : "Upload TDS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
