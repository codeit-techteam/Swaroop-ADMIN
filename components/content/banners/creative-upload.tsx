"use client";

import { ImagePlus, Replace, Trash2, Crop } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreativeUploadProps {
  label: string;
  hint: string;
  value?: string;
  onChange: (dataUrl?: string) => void;
  aspectClassName?: string;
}

export function CreativeUpload({
  label,
  hint,
  value,
  onChange,
  aspectClassName = "aspect-[16/5]",
}: CreativeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {value ? (
        <div className="overflow-hidden rounded-md border bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className={cn("w-full object-cover", aspectClassName)} />
          <div className="flex flex-wrap gap-2 border-t bg-white p-2">
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <Replace className="size-3.5" />
              Replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => toast.message("Crop will be available when media processing is connected.")}
            >
              <Crop className="size-3.5" />
              Crop
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(undefined)}>
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center justify-center rounded-md border border-dashed bg-slate-50 px-4 py-8 text-center transition hover:border-primary/40 hover:bg-sky-50/40",
            aspectClassName,
          )}
        >
          <ImagePlus className="mb-2 size-5 text-muted-foreground" />
          <p className="text-sm font-medium">Drag & drop or browse files</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or SVG · local preview only</p>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
