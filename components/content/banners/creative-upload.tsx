"use client";

import { ImagePlus, Link2, Loader2, Replace, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { uploadBannerCreative } from "@/lib/api/banners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CreativeUploadProps {
  label: string;
  hint: string;
  /** Browser-loadable preview (HTTPS / data). */
  value?: string;
  /** Durable R2 object key (or HTTPS paste) persisted to CmsBanner.mediaKey. */
  storageKey?: string;
  onChange: (next: { previewUrl?: string; storageKey?: string }) => void;
  aspectClassName?: string;
}

function isHttpUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function CreativeUpload({
  label,
  hint,
  value,
  storageKey,
  onChange,
  aspectClassName = "aspect-[16/5]",
}: CreativeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [localPreview, setLocalPreview] = useState<string | undefined>();

  useEffect(() => {
    setLocalPreview(undefined);
  }, [value, storageKey]);

  const previewSrc =
    localPreview ||
    (isHttpUrl(value) ? value : undefined) ||
    (isHttpUrl(storageKey) ? storageKey : undefined);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Banner images must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const { mediaKey, mediaUrl } = await uploadBannerCreative(file);
      setLocalPreview(mediaUrl);
      onChange({ previewUrl: mediaUrl, storageKey: mediaKey });
      toast.success("Creative uploaded to storage.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      if (message.toLowerCase().includes("storage") || message.includes("503")) {
        toast.error(
          "Object storage is not configured. Paste a public HTTPS image URL instead.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setUploading(false);
    }
  }

  function applyUrl() {
    const next = urlDraft.trim();
    if (!isHttpUrl(next)) {
      toast.error("Enter a valid https:// image URL.");
      return;
    }
    setLocalPreview(next);
    onChange({ previewUrl: next, storageKey: next });
    setUrlDraft("");
    toast.success("Image URL attached.");
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {previewSrc || storageKey ? (
        <div className="overflow-hidden rounded-md border bg-slate-50">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={label}
              className={cn("w-full object-cover", aspectClassName)}
            />
          ) : (
            <div
              className={cn(
                "flex items-center justify-center bg-slate-100 text-xs text-muted-foreground",
                aspectClassName,
              )}
            >
              Uploaded · key saved
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t bg-white p-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Replace className="size-3.5" />
              )}
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setLocalPreview(undefined);
                onChange({});
              }}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center rounded-md border border-dashed bg-slate-50 px-4 py-8 text-center transition hover:border-primary/40 hover:bg-sky-50/40 disabled:opacity-60",
            aspectClassName,
          )}
        >
          {uploading ? (
            <Loader2 className="mb-2 size-5 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="mb-2 size-5 text-muted-foreground" />
          )}
          <p className="text-sm font-medium">
            {uploading ? "Uploading creative…" : "Drag & drop or browse files"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG, WebP · max 5 MB · stored on R2
          </p>
        </button>
      )}
      <div className="flex gap-2">
        <Input
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          placeholder="Or paste a public https:// image URL"
          className="h-9"
        />
        <Button type="button" size="sm" variant="outline" onClick={applyUrl}>
          <Link2 className="size-3.5" />
          Use URL
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
