"use client";

import { AlertTriangle, CheckCircle2, Circle, Download, Eye, MessageSquareWarning, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DocumentPreview } from "@/components/documents/document-preview";
import { KycActivityTimeline } from "@/components/kyc/kyc-activity-timeline";
import { KycDocumentHistory } from "@/components/kyc/kyc-document-history";
import { KycVerificationSection } from "@/components/kyc/kyc-verification-section";
import { DetailRow } from "@/components/shared/detail-drawer";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadAdminDocument } from "@/lib/api/ops";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminKycDetail, AdminKycDocument, KycRecord } from "@/types";

function formatBytes(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface KycReviewPanelProps {
  record: KycRecord;
  detail: AdminKycDetail | null;
  error: string | null;
  onRetry: () => void;
  activeDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onVerifyDocument: (doc: AdminKycDocument) => void;
  onRejectDocument: (doc: AdminKycDocument) => void;
}

export function KycReviewPanel({
  record,
  detail,
  error,
  onRetry,
  activeDocumentId,
  onSelectDocument,
  onVerifyDocument,
  onRejectDocument,
}: KycReviewPanelProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  if (error) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        {error}{" "}
        <button type="button" className="font-medium text-navy underline" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-20 w-full rounded-md" />
        <Skeleton className="h-40 w-full rounded-md" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  const current = detail.record;
  const documents = detail.slots.flatMap((slot) => (slot.document ? [slot.document] : []));
  const active = documents.find((doc) => doc.id === activeDocumentId) ?? null;

  const download = async (doc: AdminKycDocument) => {
    setDownloading(doc.id);
    try {
      const data = await downloadAdminDocument(doc.id, "attachment");
      if (!data?.url) throw new Error("Download URL was not issued");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="grid gap-4">
      {current.status === "Changes Requested" && current.changeRequest ? (
        <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <MessageSquareWarning className="size-4" /> Waiting for the {record.entityType.toLowerCase()} to resubmit
          </p>
          <p className="mt-1 whitespace-pre-line">{current.changeRequest.reason}</p>
          <p className="mt-1 text-xs text-orange-800/80">
            Requested {formatDateTime(current.changeRequest.requestedAt)}
          </p>
        </div>
      ) : null}
      {current.status === "Rejected" && current.rejectedReason ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">Rejected</p>
          <p className="mt-1 whitespace-pre-line">{current.rejectedReason}</p>
        </div>
      ) : null}

      <dl className="rounded-md border px-3">
        <DetailRow label="Status" value={<StatusBadge value={current.status} />} />
        <DetailRow label="Type" value={current.entityType} />
        <DetailRow label="Legal name" value={detail.legalName || current.entity} />
        <DetailRow
          label="Contact"
          value={[current.contact, current.phone, current.email].filter(Boolean).join(" · ") || "—"}
        />
        <DetailRow label="GSTIN" value={current.gst || "—"} />
        <DetailRow label="PAN" value={<span className="font-mono">{current.pan || "—"}</span>} />
        <DetailRow label="Bank" value={current.bank || "—"} />
        {detail.address ? <DetailRow label="Address" value={detail.address} /> : null}
        <DetailRow
          label="Submitted"
          value={current.status === "Pending" ? "Not submitted yet" : formatDateTime(current.submitted)}
        />
        {current.reviewedAt ? <DetailRow label="Last review" value={formatDateTime(current.reviewedAt)} /> : null}
      </dl>

      <KycVerificationSection detail={detail} />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Documents</h3>
          <span className="text-xs text-muted-foreground">
            {documents.length} uploaded · {current.documentsPending ?? 0} pending review
          </span>
        </div>
        <ul className="divide-y rounded-md border">
          {detail.slots.map((slot) => {
            const doc = slot.document;
            const Icon = !doc
              ? Circle
              : doc.status === "Verified"
                ? CheckCircle2
                : doc.status === "Rejected"
                  ? XCircle
                  : Circle;
            return (
              <li
                key={slot.slot}
                className={cn("px-3 py-2.5", doc && doc.id === activeDocumentId && "bg-navy/5")}
              >
                <div className="flex items-start gap-2">
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      !doc
                        ? "text-slate-300"
                        : doc.status === "Verified"
                          ? "text-emerald-600"
                          : doc.status === "Rejected"
                            ? "text-red-600"
                            : "text-amber-600",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      {slot.name}
                      {slot.required ? null : (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                      )}
                    </p>
                    {doc ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {[doc.fileName, formatBytes(doc.fileSizeBytes), formatDateTime(doc.uploadedAt)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not uploaded yet</p>
                    )}
                    {doc?.status === "Rejected" && doc.rejectionReason ? (
                      <p className="mt-0.5 text-xs text-red-700">Rejected: {doc.rejectionReason}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {doc ? <StatusBadge value={doc.status} /> : <StatusBadge value={slot.required ? "Missing" : "Optional"} />}
                    {doc?.source ? <SourceBadge source={doc.source} /> : null}
                  </div>
                </div>
                {doc ? (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                    <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => onSelectDocument(doc.id)}>
                      <Eye className="size-3.5" /> View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={downloading === doc.id}
                      onClick={() => void download(doc)}
                    >
                      <Download className="size-3.5" /> {downloading === doc.id ? "Preparing…" : "Download"}
                    </Button>
                    {doc.status === "Pending" ? (
                      <>
                        <Button type="button" size="sm" className="h-7" onClick={() => onVerifyDocument(doc)}>
                          Verify
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-red-700 hover:text-red-800"
                          onClick={() => onRejectDocument(doc)}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {detail.blockers.length && current.status !== "Approved" ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Approval blocked: {detail.blockers.join(", ")}. Use Request Changes to ask for a new upload.
          </p>
        ) : null}
      </section>

      {record.entityId ? (
        <KycDocumentHistory
          record={{ entityType: record.entityType, entityId: record.entityId }}
          history={detail.documentHistory}
        />
      ) : null}

      {active ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            {active.slotLabel} <span className="font-normal text-muted-foreground">· {active.fileName}</span>
          </h3>
          <DocumentPreview documentId={active.id} mimeType={active.mimeType} fileName={active.fileName} />
        </section>
      ) : documents.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No documents uploaded yet. They appear here as soon as the {record.entityType.toLowerCase()} uploads them
          from the {record.entityType} App or Web.
        </p>
      ) : null}

      {record.entityId ? (
        <KycActivityTimeline
          record={{ entityType: record.entityType, entityId: record.entityId }}
          refreshKey={detail}
        />
      ) : null}
    </div>
  );
}
