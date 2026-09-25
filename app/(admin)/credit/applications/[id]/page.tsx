"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CreditInsuranceDialog } from "@/components/credit/credit-insurance-dialog";
import { CreditReasonDialog } from "@/components/credit/credit-reason-dialog";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { DetailRow } from "@/components/shared/detail-drawer";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  approveCreditApplication,
  downloadCreditDocument,
  getCreditApplication,
  getCreditApplicationTimeline,
  markCreditArrangementPending,
  partialApproveCreditApplication,
  rejectCreditApplication,
  rejectCreditApplicationDocument,
  requestCreditDocuments,
  sendCreditInsuranceReview,
  startCreditReview,
  verifyCreditApplicationDocument,
} from "@/lib/api/credit";
import {
  canMutateCredit,
  creditErrorMessage,
  displayMoney,
  humanizeCreditAction,
  humanizeCreditStatus,
} from "@/lib/credit-format";
import { formatDate, formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import type { CreditDocument } from "@/types/credit";

type DecisionDialog = "approve" | "partial" | "reject" | "documents" | "insurance" | "arrangement";

export default function CreditApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const user = useAuthStore((s) => s.user);
  const canMutate = canMutateCredit(user?.role);
  const { data, error, loading, reload } = useCreditQuery(() => getCreditApplication(id), [id]);
  const timelineQuery = useCreditQuery(() => getCreditApplicationTimeline(id), [id]);
  const [dialog, setDialog] = useState<DecisionDialog | null>(null);
  const [documentToReject, setDocumentToReject] = useState<CreditDocument | null>(null);

  const timelineEvents = timelineQuery.data ?? data?.timeline ?? [];

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      reload();
      timelineQuery.reload();
    } catch (err) {
      toast.error(creditErrorMessage(err, "Unable to update the credit application."));
    }
  };

  const onDownload = async (documentId: string) => {
    try {
      const result = await downloadCreditDocument(documentId);
      if (result.storagePending || !result.url) {
        toast.message("R2 storage is not connected yet. Document key is retained for later download.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(creditErrorMessage(err, "Unable to download this document."));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={data?.applicationNumber ?? "Credit application"}
        description="PetroTrade credit application review"
        breadcrumbs={[
          { label: "Credit Management", href: "/credit" },
          { label: "Applications", href: "/credit/applications" },
          { label: data?.applicationNumber ?? "Detail" },
        ]}
        actions={
          canMutate && data ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => run(() => startCreditReview(id), "Review started")}>
                Start Review
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDialog("documents")}>
                Request Documents
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDialog("insurance")}>
                Send to Insurance Review
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDialog("arrangement")}>
                Mark Arrangement Pending
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDialog("partial")}>
                Partial Approve
              </Button>
              <Button size="sm" onClick={() => setDialog("approve")}>
                Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDialog("reject")}>
                Reject
              </Button>
            </div>
          ) : null
        }
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit application…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : data ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-md border bg-white p-4 xl:col-span-2">
            <p className="section-label mb-3">Customer information</p>
            <dl>
              <DetailRow label="Customer" value={data.customer.name} />
              <DetailRow label="Customer ID" value={data.customer.id} />
              <DetailRow label="Business type" value={data.customer.businessType ?? "—"} />
              <DetailRow label="Contact" value={data.customer.contactName ?? "—"} />
              <DetailRow label="Email" value={data.customer.email ?? "—"} />
              <DetailRow label="GSTIN" value={data.customer.gstin ?? "—"} />
              <DetailRow label="PAN" value={data.customer.pan ?? "—"} />
            </dl>
            <p className="section-label mb-3 mt-6">Requested credit</p>
            <dl>
              <DetailRow label="Requested limit" value={displayMoney(data.requestedLimit)} />
              <DetailRow label="Requested tenure" value={data.requestedTenureDays ? `${data.requestedTenureDays} days` : "—"} />
              <DetailRow label="Purpose" value={data.purpose ?? "—"} />
              <DetailRow label="Existing exposure" value={displayMoney(data.existingExposure)} />
              <DetailRow label="Status" value={<StatusBadge value={humanizeCreditStatus(data.status)} />} />
              <DetailRow label="Submitted at" value={data.submittedAt ? formatDateTime(data.submittedAt) : "—"} />
              <DetailRow label="Assigned admin" value={data.assignedAdminName ?? "Unassigned"} />
            </dl>
          </section>
          <section className="rounded-md border bg-white p-4">
            <p className="section-label mb-3">Decision</p>
            <dl>
              <DetailRow label="Approved limit" value={displayMoney(data.approvedLimit)} />
              <DetailRow
                label="Approved tenure"
                value={data.approvedTenureDays ? `${data.approvedTenureDays} days` : "—"}
              />
              <DetailRow label="Decision reason" value={data.decisionReason ?? "—"} />
              <DetailRow label="Customer message" value={data.customerMessage ?? "—"} />
              <DetailRow label="Decided at" value={data.decidedAt ? formatDateTime(data.decidedAt) : "—"} />
              {data.creditAccountId ? (
                <DetailRow
                  label="Credit account"
                  value={
                    <Link className="text-primary" href={`/credit/accounts/${data.creditAccountId}`}>
                      Open account
                    </Link>
                  }
                />
              ) : null}
            </dl>
          </section>
          <section className="rounded-md border bg-white p-4 xl:col-span-2">
            <p className="section-label mb-3">Documents</p>
            {data.storage?.pending ? (
              <p className="mb-3 text-xs text-amber-700">R2 storage is not connected. Document keys are retained; downloads are pending.</p>
            ) : null}
            {(data.documents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No credit documents found.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(data.documents ?? []).map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.category} · Uploaded {formatDate(doc.createdAt)}
                      </p>
                      {doc.rejectionReason ? (
                        <p className="text-xs text-red-700">Rejected: {doc.rejectionReason}</p>
                      ) : null}
                      {doc.verificationNotes ? (
                        <p className="text-xs text-muted-foreground">{doc.verificationNotes}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={humanizeCreditStatus(doc.status)} />
                      <Button size="sm" variant="ghost" onClick={() => void onDownload(doc.id)}>
                        Download
                      </Button>
                      {canMutate ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={doc.status === "VERIFIED"}
                            onClick={() =>
                              run(() => verifyCreditApplicationDocument(id, doc.id), "Document verified")
                            }
                          >
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={doc.status === "REJECTED"}
                            onClick={() => setDocumentToReject(doc)}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-md border bg-white p-4">
            <p className="section-label mb-3">Insurance &amp; credit arrangement</p>
            <dl>
              <DetailRow
                label="Insurance status"
                value={
                  data.insuranceStatus ? <StatusBadge value={humanizeCreditStatus(data.insuranceStatus)} /> : "—"
                }
              />
              <DetailRow
                label="Arrangement status"
                value={
                  data.arrangementStatus ? <StatusBadge value={humanizeCreditStatus(data.arrangementStatus)} /> : "—"
                }
              />
              {data.insurancePartner ? <DetailRow label="Insurance partner" value={data.insurancePartner} /> : null}
              {data.insuranceReference ? <DetailRow label="Reference" value={data.insuranceReference} /> : null}
              {data.insuredAmount ? <DetailRow label="Insured amount" value={displayMoney(data.insuredAmount)} /> : null}
              {data.effectiveAt ? <DetailRow label="Effective from" value={formatDateTime(data.effectiveAt)} /> : null}
              {data.expiresAt ? <DetailRow label="Expires at" value={formatDateTime(data.expiresAt)} /> : null}
            </dl>
          </section>
          <section className="rounded-md border bg-white p-4 xl:col-span-2">
            <p className="section-label mb-3">Application timeline</p>
            {timelineQuery.error ? (
              <p className="mb-3 text-xs text-amber-700">{timelineQuery.error}</p>
            ) : null}
            {timelineQuery.loading && timelineEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading timeline…</p>
            ) : (
              <ActivityTimeline
                items={timelineEvents.map((item) => ({
                  id: item.id,
                  title: humanizeCreditAction(item.eventType),
                  detail: [
                    item.description,
                    item.actorRole ? humanizeCreditStatus(item.actorRole) : null,
                    item.customerVisible ? "Customer visible" : "Internal",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  time: item.createdAt,
                  source: "Admin Portal" as const,
                }))}
              />
            )}
          </section>
          <section className="rounded-md border bg-white p-4">
            <p className="section-label mb-3">Audit timeline</p>
            <ActivityTimeline
              items={(data.audit ?? []).map((item) => ({
                id: item.id,
                title: humanizeCreditAction(item.action),
                detail: item.actor,
                time: item.createdAt,
                source: "Admin Portal" as const,
              }))}
            />
          </section>
        </div>
      ) : null}

      <CreditReasonDialog
        open={dialog === "approve"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Approve PetroTrade credit"
        description="Assign a platform credit limit. This does not create seller credit."
        confirmLabel="Approve"
        amountLabel="Approved limit (INR)"
        amountRequired
        onConfirm={({ reason, amount }) => {
          if (amount == null) return;
          void run(
            () => approveCreditApplication(id, { approvedLimit: amount, reason }),
            "Credit application approved",
          );
          setDialog(null);
          router.refresh();
        }}
      />
      <CreditReasonDialog
        open={dialog === "partial"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Partially approve PetroTrade credit"
        description="Approve a lower limit than the customer requested. A credit account is created at this limit."
        confirmLabel="Partial Approve"
        amountLabel="Approved limit (INR)"
        amountRequired
        onConfirm={({ reason, amount }) => {
          if (amount == null) return;
          void run(
            () => partialApproveCreditApplication(id, { approvedLimit: amount, reason }),
            "Credit application partially approved",
          );
          setDialog(null);
          router.refresh();
        }}
      />
      <CreditReasonDialog
        open={dialog === "reject"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Reject credit application"
        description="The customer will not receive PetroTrade credit until they re-apply."
        confirmLabel="Reject"
        destructive
        onConfirm={({ reason }) => {
          void run(() => rejectCreditApplication(id, reason), "Credit application rejected");
          setDialog(null);
        }}
      />
      <CreditReasonDialog
        open={dialog === "documents"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Request documents"
        description="Ask the customer for additional KYC or financial documents."
        confirmLabel="Request"
        onConfirm={({ reason }) => {
          void run(() => requestCreditDocuments(id, { message: reason }), "Documents requested");
          setDialog(null);
        }}
      />
      <CreditReasonDialog
        open={documentToReject != null}
        onOpenChange={(open) => !open && setDocumentToReject(null)}
        title={documentToReject ? `Reject ${documentToReject.fileName}` : "Reject document"}
        description="The customer is notified and asked to upload a replacement. A reason is required."
        confirmLabel="Reject document"
        destructive
        onConfirm={({ reason }) => {
          const target = documentToReject;
          if (!target) return;
          void run(() => rejectCreditApplicationDocument(id, target.id, reason), "Document rejected");
          setDocumentToReject(null);
        }}
      />
      <CreditInsuranceDialog
        open={dialog === "insurance"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Send to insurance review"
        description="Hand the application to the credit insurance partner. All fields are optional."
        confirmLabel="Send for review"
        defaults={data ?? undefined}
        onConfirm={(payload) => {
          void run(() => sendCreditInsuranceReview(id, payload), "Sent for insurance review");
          setDialog(null);
        }}
      />
      <CreditInsuranceDialog
        open={dialog === "arrangement"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Mark credit arrangement pending"
        description="Record the insurance outcome and move the application into credit arrangement."
        confirmLabel="Mark pending"
        defaults={data ?? undefined}
        onConfirm={(payload) => {
          void run(() => markCreditArrangementPending(id, payload), "Credit arrangement pending");
          setDialog(null);
        }}
      />
    </div>
  );
}
