"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTdsPreview, type TdsDocument, type TdsPreview } from "@/lib/api/tds";
import { cn } from "@/lib/utils";

type Props = {
  document: TdsDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function isImageMime(mime?: string | null, fileName?: string | null) {
  if (mime?.startsWith("image/")) return true;
  const ext = fileName?.split(".").pop()?.toLowerCase();
  return Boolean(ext && ["png", "jpg", "jpeg", "webp", "gif"].includes(ext));
}

function isPdfMime(mime?: string | null, fileName?: string | null) {
  if (mime === "application/pdf") return true;
  return fileName?.toLowerCase().endsWith(".pdf") ?? false;
}

export function TdsPreviewDialog({ document: doc, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<TdsPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc?.id || !doc.hasFile) {
      setPreview(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    void getTdsPreview(doc.id)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load TDS preview",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, doc?.id, doc?.hasFile]);

  const mime = preview?.mimeType ?? doc?.mimeType;
  const fileName = preview?.fileName ?? doc?.originalFilename;
  const asImage = isImageMime(mime, fileName);
  const asPdf = isPdfMime(mime, fileName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,900px)] w-[min(96vw,1100px)] max-w-none flex-col gap-3 p-4 sm:rounded-xl">
        <DialogHeader className="shrink-0 space-y-1 pr-8 text-left">
          <DialogTitle className="truncate text-base">
            {doc?.documentTitle ?? "TDS preview"}
          </DialogTitle>
          <DialogDescription className="truncate">
            {[fileName, doc?.gradeCode, doc?.producerName]
              .filter(Boolean)
              .join(" · ") || "Technical data sheet"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!preview?.url}
            onClick={() => {
              if (!preview?.url) return;
              window.open(preview.url, "_blank", "noopener,noreferrer");
            }}
          >
            <ExternalLink className="size-3.5" />
            Open in new tab
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!preview?.url}
            onClick={() => {
              if (!preview?.url) return;
              const a = window.document.createElement("a");
              a.href = preview.url;
              a.download = fileName || "tds.pdf";
              a.rel = "noopener noreferrer";
              a.target = "_blank";
              window.document.body.appendChild(a);
              a.click();
              a.remove();
              toast.success("Download started");
            }}
          >
            <Download className="size-3.5" />
            Download
          </Button>
        </div>

        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100",
          )}
        >
          {loading ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              Loading TDS…
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-red-600">
              <FileText className="size-8 opacity-60" />
              <p>{error}</p>
            </div>
          ) : preview?.url && asImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt={doc?.documentTitle ?? "TDS"}
              className="mx-auto h-full max-h-full w-auto max-w-full object-contain p-2"
            />
          ) : preview?.url && asPdf ? (
            <iframe
              title={doc?.documentTitle ?? "TDS PDF"}
              src={`${preview.url}#toolbar=1&navpanes=0`}
              className="h-full min-h-[320px] w-full border-0 bg-white"
            />
          ) : preview?.url ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
              <FileText className="size-8" />
              <p>This file type can’t be embedded. Open it in a new tab.</p>
              <Button
                size="sm"
                onClick={() =>
                  window.open(preview.url, "_blank", "noopener,noreferrer")
                }
              >
                <ExternalLink className="size-3.5" />
                Open file
              </Button>
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-muted-foreground">
              No file available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Compact inline preview card for the TDS detail drawer. */
export function TdsInlinePreviewCard({
  document: doc,
  onOpenFull,
}: {
  document: TdsDocument;
  onOpenFull: () => void;
}) {
  const [preview, setPreview] = useState<TdsPreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!doc.hasFile) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getTdsPreview(doc.id)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doc.id, doc.hasFile]);

  if (!doc.hasFile) return null;

  const mime = preview?.mimeType ?? doc.mimeType;
  const fileName = preview?.fileName ?? doc.originalFilename;
  const asImage = isImageMime(mime, fileName);
  const asPdf = isPdfMime(mime, fileName);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          File preview
        </h3>
        <Button size="sm" variant="outline" onClick={onOpenFull}>
          View full size
        </Button>
      </div>
      <button
        type="button"
        onClick={onOpenFull}
        className="group relative block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left transition hover:border-primary/40"
      >
        {loading ? (
          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
          </div>
        ) : preview?.url && asImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.url}
            alt=""
            className="mx-auto max-h-56 w-auto object-contain p-2"
          />
        ) : preview?.url && asPdf ? (
          <div className="relative h-56 w-full bg-white">
            <iframe
              title="TDS thumbnail"
              src={`${preview.url}#toolbar=0&navpanes=0&scrollbar=0`}
              className="pointer-events-none h-full w-full border-0"
              tabIndex={-1}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 to-transparent opacity-0 transition group-hover:opacity-100" />
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
            <FileText className="size-6" />
            <span className="truncate px-3 text-xs">
              {fileName || "Open TDS file"}
            </span>
          </div>
        )}
      </button>
    </section>
  );
}
