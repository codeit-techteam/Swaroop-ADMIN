"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/documents/reason-dialog";
import { RequestChangesDialog } from "@/components/kyc/request-changes-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  approveAdminSeller,
  getAdminSellerReview,
  onboardingSlotLabel,
  rejectAdminSeller,
  requestAdminKycChanges,
} from "@/lib/api/ops";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminKycSlot, AdminSellerOnboardingDocument, AdminSellerReview } from "@/types";

const REQUIRED_SLOTS = ["gst", "pan", "aadhaar", "cancelledCheque"] as const;

const SELLER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_VERIFICATION: "Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  INACTIVE: "Inactive",
};

const ONBOARDING_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

const SELLER_REJECT_PRESETS = [
  "Documents do not match the registered business details.",
  "GST registration could not be verified.",
  "Bank account details could not be verified.",
];

interface SellerOnboardingPanelProps {
  sellerId: string;
  activeDocumentId?: string;
  /** Bump to reload after a document was verified/rejected elsewhere in the drawer. */
  refreshKey?: number;
  onSelectDocument?: (documentId: string) => void;
  onChanged?: () => void;
}

function currentForSlot(docs: AdminSellerOnboardingDocument[], slot: string) {
  const slotDocs = docs.filter((doc) => doc.slot === slot);
  return {
    current: slotDocs.find((doc) => doc.status !== "Rejected") ?? null,
    rejected: slotDocs.find((doc) => doc.status === "Rejected") ?? null,
  };
}

export function SellerOnboardingPanel({
  sellerId,
  activeDocumentId,
  refreshKey = 0,
  onSelectDocument,
  onChanged,
}: SellerOnboardingPanelProps) {
  const [review, setReview] = useState<AdminSellerReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"approve" | "reject" | "changes" | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReview(await getAdminSellerReview(sellerId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load seller");
    }
  }, [sellerId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (error) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        {error}{" "}
        <button type="button" className="font-medium text-navy underline" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!review) return <Skeleton className="h-48 w-full rounded-md" />;

  const slots = REQUIRED_SLOTS.map((slot) => ({ slot, ...currentForSlot(review.documents, slot) }));
  const blockers = slots
    .filter((s) => !s.current)
    .map((s) => `${onboardingSlotLabel(s.slot)} ${s.rejected ? "rejected" : "missing"}`);
  const pendingCount = slots.filter((s) => s.current && s.current.status !== "Verified").length;
  const approved = review.status === "APPROVED";

  const approve = async (notes: string) => {
    try {
      await approveAdminSeller(review.id, notes);
      toast.success(`${review.company} approved — seller can now list products.`);
      await load();
      onChanged?.();
    } catch (approveError) {
      toast.error(approveError instanceof Error ? approveError.message : "Approval failed");
      throw approveError;
    }
  };

  const changeSlots: AdminKycSlot[] = slots.map(({ slot, current, rejected }) => {
    const doc = current ?? rejected;
    return {
      slot,
      name: onboardingSlotLabel(slot) ?? slot,
      description: "",
      required: true,
      document: doc
        ? {
            id: doc.id,
            slot: doc.slot,
            slotLabel: onboardingSlotLabel(slot) ?? slot,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            fileSizeBytes: null,
            status: doc.status,
            rejectionReason: doc.rejectionReason,
            source: null,
            uploadedAt: doc.uploadedAt,
            reviewedAt: null,
          }
        : null,
    };
  });

  const requestChanges = async (reason: string, documentIds: string[]) => {
    try {
      await requestAdminKycChanges({ entityType: "Seller", entityId: review.id }, reason, documentIds);
      toast.success(`Changes requested — ${review.company} has been notified.`);
      await load();
      onChanged?.();
    } catch (changeError) {
      toast.error(changeError instanceof Error ? changeError.message : "Could not request changes");
      throw changeError;
    }
  };

  const reject = async (reason: string) => {
    try {
      await rejectAdminSeller(review.id, reason);
      toast.success(`${review.company} rejected — seller has been notified.`);
      await load();
      onChanged?.();
    } catch (rejectError) {
      toast.error(rejectError instanceof Error ? rejectError.message : "Rejection failed");
      throw rejectError;
    }
  };

  return (
    <section className="rounded-md border bg-slate-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{review.company}</p>
          <p className="text-xs text-muted-foreground">
            {[review.contact, review.phone, review.email].filter(Boolean).join(" · ") || "No contact on file"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            GSTIN {review.gstin || "—"} · PAN {review.pan || "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge value={SELLER_STATUS_LABEL[review.status] ?? review.status} />
          {review.onboardingStatus ? (
            <span className="text-[11px] text-muted-foreground">
              Onboarding: {ONBOARDING_STATUS_LABEL[review.onboardingStatus] ?? review.onboardingStatus}
              {review.submittedAt ? ` · ${formatDateTime(review.submittedAt)}` : ""}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="mt-3 divide-y rounded-md border bg-white">
        {slots.map(({ slot, current, rejected }) => {
          const doc = current ?? rejected;
          const Icon = !current ? (rejected ? XCircle : Circle) : current.status === "Verified" ? CheckCircle2 : Circle;
          return (
            <li key={slot}>
              <button
                type="button"
                disabled={!doc || !onSelectDocument}
                onClick={() => doc && onSelectDocument?.(doc.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:cursor-default",
                  doc && onSelectDocument && "hover:bg-slate-50",
                  doc?.id === activeDocumentId && "bg-navy/5",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    current?.status === "Verified"
                      ? "text-emerald-600"
                      : !current && rejected
                        ? "text-red-600"
                        : current
                          ? "text-amber-600"
                          : "text-slate-300",
                  )}
                />
                <span className="flex-1">
                  <span className="font-medium text-slate-800">{onboardingSlotLabel(slot)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {doc ? doc.fileName : "Not uploaded yet"}
                  </span>
                </span>
                {doc ? <StatusBadge value={doc.status} /> : <span className="text-xs text-muted-foreground">Missing</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {!approved && blockers.length ? (
        <p className="mt-2 text-xs text-amber-700">
          Approval blocked: {blockers.join(", ")}. The seller must upload these before approval.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button
          type="button"
          size="sm"
          disabled={approved || blockers.length > 0}
          onClick={() => setDialog("approve")}
        >
          {approved ? "Seller approved" : "Approve seller"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={review.status === "REJECTED"}
          onClick={() => setDialog("reject")}
        >
          Reject seller
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={approved}
          onClick={() => setDialog("changes")}
        >
          Request changes
        </Button>
      </div>

      <RequestChangesDialog
        open={dialog === "changes"}
        onOpenChange={(open) => !open && setDialog(null)}
        entityName={review.company}
        audience="seller"
        slots={changeSlots}
        initialDocumentId={activeDocumentId}
        onSubmit={requestChanges}
      />

      <ReasonDialog
        open={dialog === "approve"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Approve ${review.company}?`}
        description={
          pendingCount
            ? `${pendingCount} document(s) still pending review will be marked Verified. The seller account, organization and user are activated.`
            : "All onboarding documents are verified. The seller account, organization and user are activated."
        }
        confirmLabel="Approve seller"
        required={false}
        placeholder="Internal notes (optional)"
        onSubmit={approve}
      />
      <ReasonDialog
        open={dialog === "reject"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Reject ${review.company}?`}
        description="The seller is notified with this reason and can correct their onboarding details."
        confirmLabel="Reject seller"
        destructive
        presets={SELLER_REJECT_PRESETS}
        onSubmit={reject}
      />
    </section>
  );
}
