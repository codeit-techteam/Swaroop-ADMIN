"use client";

import { Activity } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAdminKycAudit } from "@/lib/api/ops";
import { formatDateTime } from "@/lib/format";
import type { AdminKycAuditEvent, KycRecord } from "@/types";

const ACTION_LABELS: Record<string, string> = {
  CUSTOMER_KYC_SUBMITTED: "KYC submitted",
  CUSTOMER_KYC_RESUBMITTED: "KYC resubmitted",
  CUSTOMER_KYC_APPROVED: "KYC approved",
  CUSTOMER_KYC_REJECTED: "KYC rejected",
  CUSTOMER_KYC_CHANGES_REQUESTED: "Resubmission requested",
  CUSTOMER_KYC_PAN_VERIFICATION_STARTED: "PAN verification started",
  CUSTOMER_KYC_PAN_VERIFIED: "PAN verified",
  CUSTOMER_KYC_PAN_VERIFICATION_FAILED: "PAN verification failed",
  CUSTOMER_KYC_PAN_MANUAL_REVIEW: "PAN sent to manual review",
  CUSTOMER_KYC_GST_VERIFICATION_STARTED: "GST verification started",
  CUSTOMER_KYC_GST_VERIFIED: "GSTIN verified",
  CUSTOMER_KYC_GST_VERIFICATION_FAILED: "GST verification failed",
  CUSTOMER_KYC_GST_MANUAL_REVIEW: "GSTIN sent to manual review",
  CUSTOMER_KYC_DOCUMENT_UPLOAD_STARTED: "Document upload started",
  CUSTOMER_KYC_DOCUMENT_UPLOADED: "Document uploaded",
  CUSTOMER_KYC_DOCUMENT_REPLACED: "Document replaced",
  CUSTOMER_KYC_DOCUMENT_REMOVED: "Document removed",
  DOCUMENT_PREVIEWED: "Document viewed",
  DOCUMENT_DOWNLOADED: "Document downloaded",
  SELLER_ONBOARDING_STARTED: "Onboarding started",
  SELLER_ONBOARDING_SUBMITTED: "Onboarding submitted",
  SELLER_ONBOARDING_DOCUMENT_UPLOAD_STARTED: "Document upload started",
  SELLER_ONBOARDING_DOCUMENT_STORED: "Document uploaded",
  SELLER_ONBOARDING_DOCUMENT_REMOVED: "Document removed",
  SELLER_KYC_PAN_VERIFICATION_STARTED: "PAN verification started",
  SELLER_KYC_PAN_VERIFIED: "PAN verified",
  SELLER_KYC_PAN_VERIFICATION_FAILED: "PAN verification failed",
  SELLER_KYC_PAN_MANUAL_REVIEW: "PAN sent to manual review",
  SELLER_KYC_GST_VERIFICATION_STARTED: "GST verification started",
  SELLER_KYC_GST_VERIFIED: "GSTIN verified",
  SELLER_KYC_GST_VERIFICATION_FAILED: "GST verification failed",
  SELLER_KYC_GST_MANUAL_REVIEW: "GSTIN sent to manual review",
  SELLER_KYC_IDENTITY_MANUALLY_VERIFIED: "PAN / GSTIN confirmed by admin",
  SELLER_APPROVED: "Seller approved",
  SELLER_REJECTED: "Seller rejected",
  SELLER_CHANGES_REQUESTED: "Changes requested",
};

const DETAIL_LABELS: Record<string, string> = {
  slot: "Document",
  version: "Version",
  identifier: "Number",
  status: "Status",
  failureCode: "Code",
  reason: "Reason",
  kycStatus: "KYC status",
  fileName: "File",
  provider: "Provider",
  source: "Source",
};

function actionLabel(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const text = action.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function actorLabel(event: AdminKycAuditEvent) {
  if (event.actor.role === "SYSTEM") return "System";
  const role = event.actor.role.charAt(0) + event.actor.role.slice(1).toLowerCase();
  return event.actor.name ? `${event.actor.name} (${role})` : role;
}

interface KycActivityTimelineProps {
  record: Pick<KycRecord, "entityType" | "entityId">;
  /** Changes whenever the detail reloads, so actions taken in the drawer show up. */
  refreshKey: unknown;
}

export function KycActivityTimeline({ record, refreshKey }: KycActivityTimelineProps) {
  const [events, setEvents] = useState<AdminKycAuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { entityType, entityId } = record;

  const load = useCallback(async () => {
    setError(null);
    try {
      setEvents(await getAdminKycAudit({ entityType, entityId }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load activity");
    }
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Activity className="size-4 text-slate-500" /> Activity
      </h3>
      {error ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          {error}{" "}
          <button type="button" className="font-medium text-navy underline" onClick={() => void load()}>
            Retry
          </button>
        </p>
      ) : !events ? (
        <Skeleton className="h-24 w-full rounded-md" />
      ) : events.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <ol className="max-h-80 overflow-y-auto rounded-md border">
          {events.map((event) => {
            const details = Object.entries(event.details).filter(([key]) => key in DETAIL_LABELS);
            return (
              <li key={event.id} className="border-b px-3 py-2 last:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-medium text-slate-800">{actionLabel(event.action)}</p>
                  <time className="text-[11px] text-muted-foreground">{formatDateTime(event.createdAt)}</time>
                </div>
                <p className="text-[11px] text-muted-foreground">{actorLabel(event)}</p>
                {details.length ? (
                  <p className="mt-0.5 break-words text-[11px] text-slate-600">
                    {details.map(([key, value]) => `${DETAIL_LABELS[key]}: ${String(value)}`).join(" · ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
