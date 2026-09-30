"use client";

import { ExternalLink, FileText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadAdminDocument } from "@/lib/api/ops";

interface DocumentPreviewProps {
  documentId: string;
  mimeType?: string | null;
  fileName?: string;
}

type PreviewState =
  | { kind: "loading" }
  | { kind: "ready"; url: string; mimeType: string | null }
  | { kind: "error"; message: string };

export function DocumentPreview({ documentId, mimeType, fileName }: DocumentPreviewProps) {
  const [state, setState] = useState<PreviewState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await downloadAdminDocument(documentId, "inline");
      if (!data?.url) throw new Error("Preview URL was not issued");
      setState({ kind: "ready", url: data.url, mimeType: data.mimeType ?? mimeType ?? null });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to load preview",
      });
    }
  }, [documentId, mimeType]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return <Skeleton className="h-72 w-full rounded-md" />;
  }

  if (state.kind === "error") {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center text-sm text-muted-foreground">
        <p>{state.message}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  const type = state.mimeType ?? "";
  const isImage = type.startsWith("image/");
  const isPdf = type === "application/pdf";

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-md border bg-slate-50">
        {isImage ? (
          // Signed R2 URLs are short-lived and not in next/image remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.url}
            alt={fileName ?? "Document preview"}
            className="mx-auto max-h-[28rem] w-auto object-contain"
          />
        ) : isPdf ? (
          <iframe src={state.url} title={fileName ?? "Document preview"} className="h-[28rem] w-full bg-white" />
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-6" />
            Preview is not available for this file type.
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Secure link expires in 5 minutes.</span>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => void load()}>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" asChild>
            <a href={state.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Open
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
