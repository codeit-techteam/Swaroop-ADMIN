"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { CreditAssignDialog } from "@/components/credit/credit-assign-dialog";
import { CreditInsuranceDialog } from "@/components/credit/credit-insurance-dialog";
import { CreditReasonDialog } from "@/components/credit/credit-reason-dialog";
import { CreditSourceBadge } from "@/components/credit/credit-source-badge";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { DetailRow } from "@/components/shared/detail-drawer";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addCreditApplicationRemark,
  approveCreditApplication,
  assignCreditApplication,
  downloadCreditDocument,
  getCreditApplication,
  getCreditApplicationTimeline,
  markCreditArrangementPending,
  partialApproveCreditApplication,
  rejectCreditApplication,
  rejectCreditApplicationDocument,
  requestCreditDocuments,
  requestCreditResubmission,
  sendCreditInsuranceReview,
  startCreditReview,
  verifyCreditApplicationDocument,
} from "@/lib/api/credit";
import {
  CREDIT_KYC_LABELS,
  canMutateCredit,
  creditApplicationStatusLabel,
  creditErrorMessage,
  displayMoney,
  humanizeCreditAction,
  humanizeCreditStatus,
} from "@/lib/credit-format";
import { formatDate, formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";
import type {
  CreditAdminAction,
  CreditApplication,
  CreditApplicationDetails,
  CreditDocument,
  CreditKycVerification,
  CreditTimelineEvent,
} from "@/types/credit";

type DecisionDialog =
  | "approve"
  | "partial"
  | "reject"
  | "documents"
  | "insurance"
  | "arrangement"
  | "resubmission"
  | "assign";

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border bg-white p-4 ${className ?? ""}`}>
      <p className="section-label mb-3">{title}</p>
      {children}
    </section>
  );
}

function ApplicantDetails({ details }: { details: CreditApplicationDetails }) {
  const { applicant, declarations } = details;
  if (!applicant && !declarations) return null;
  return (
    <>
      <p className="section-label mb-3 mt-6">As entered by the applicant</p>
      <dl>
        {applicant ? (
          <>
            <DetailRow label="Business name" value={applicant.companyName ?? "—"} />
            <DetailRow label="Contact person" value={applicant.contactPerson ?? "—"} />
            <DetailRow label="Mobile" value={applicant.mobile ?? "—"} />
            <DetailRow label="Email" value={applicant.email ?? "—"} />
            <DetailRow label="Business type" value={applicant.businessType ?? "—"} />
            <DetailRow label="Location" value={[applicant.city, applicant.state].filter(Boolean).join(", ") || "—"} />
          </>
        ) : null}
        {declarations ? (
          <DetailRow
            label="Declarations"
            value={
              declarations.accepted
                ? `Accepted${declarations.acceptedAt ? ` ${formatDateTime(declarations.acceptedAt)}` : ""}`
                : "Not accepted"
            }
          />
        ) : null}
      </dl>
    </>
  );
}

function KycRow({ label, verification }: { label: string; verification: CreditKycVerification | null | undefined }) {
  if (!verification) return <DetailRow label={label} value="Not verified yet" />;
  return (
    <DetailRow
      label={label}
      value={
        <span className="flex flex-col items-end gap-1 text-right">
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs">{verification.identifierMasked}</span>
            <StatusBadge value={humanizeCreditStatus(verification.status)} />
          </span>
          {verification.legalName ? (
            <span className="text-xs text-muted-foreground">{verification.legalName}</span>
          ) : null}
          {verification.gstStatus ? (
            <span className="text-xs text-muted-foreground">GST status: {verification.gstStatus}</span>
          ) : null}
          {verification.failureReason ? (
            <span className="text-xs text-red-700">{verification.failureReason}</span>
          ) : null}
        </span>
      }
    />
  );
}

function statusChange(event: CreditTimelineEvent): string | null {
  const meta = event.metadata as { fromStatus?: string | null; toStatus?: string } | null | undefined;
  if (!meta?.toStatus) return null;
  const from = meta.fromStatus ? creditApplicationStatusLabel(meta.fromStatus) : "New";
  return `${from} → ${creditApplicationStatusLabel(meta.toStatus)}`;
}

function DocumentRow({
  doc,
  canMutate,
  onOpen,
  onVerify,
  onReject,
}: {
  doc: CreditDocument;
  canMutate: boolean;
  onOpen: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate font-medium">{doc.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {humanizeCreditStatus(doc.category)} · Uploaded {formatDate(doc.createdAt)}
          {doc.belongsToApplication === false ? " · Business profile document" : ""}
        </p>
        {doc.rejectionReason ? <p className="text-xs text-red-700">Rejected: {doc.rejectionReason}</p> : null}
        {doc.verificationNotes ? <p className="text-xs text-muted-foreground">{doc.verificationNotes}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={humanizeCreditStatus(doc.status)} />
        <Button size="sm" variant="ghost" onClick={onOpen}>
          View / Download
        </Button>
        {canMutate ? (
          <>
            <Button size="sm" variant="outline" disabled={doc.status === "VERIFIED"} onClick={onVerify}>
              Verify
            </Button>
            <Button size="sm" variant="outline" disabled={doc.status === "REJECTED"} onClick={onReject}>
              Reject
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}

export default function CreditApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const user = useAuthStore((s) => s.user);
  const canMutate = canMutateCredit(user?.role);
  const { data, error, loading, reload } = useCreditQuery(() => getCreditApplication(id), [id]);
  const timelineQuery = useCreditQuery(() => getCreditApplicationTimeline(id), [id]);
  const [dialog, setDialog] = useState<DecisionDialog | null>(null);
  const [documentToReject, setDocumentToReject] = useState<CreditDocument | null>(null);
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);

  const timelineEvents = timelineQuery.data ?? data?.timeline ?? [];

  const run = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return false;
    setBusy(true);
    try {
      await action();
      toast.success(success);
      reload();
      timelineQuery.reload();
      return true;
    } catch (err) {
      toast.error(creditErrorMessage(err, "Unable to update the credit application."));
      reload();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onOpenDocument = async (documentId: string) => {
    try {
      const result = await downloadCreditDocument(documentId);
      if (result.storagePending || !result.url) {
        toast.message("Document storage is not connected yet. The file reference is retained for later download.");
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(creditErrorMessage(err, "Unable to open this document."));
    }
  };

  const can = (action: CreditAdminAction) => canMutate && Boolean(data?.availableActions?.includes(action));
  const assignedToMe = Boolean(user?.id && data?.assignedAdminId === user.id);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={data?.applicationNumber ?? "Credit application"}
        description="Request Credit application review"
        breadcrumbs={[
          { label: "Credit Management", href: "/credit" },
          { label: "Applications", href: "/credit/applications" },
          { label: data?.applicationNumber ?? "Detail" },
        ]}
        actions={data ? <ActionBar data={data} can={can} busy={busy} assignedToMe={assignedToMe} onAction={handleAction} /> : null}
      />
      {loading && !data ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit application…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : data ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <Section title="Application information" className="xl:col-span-2">
            <dl>
              <DetailRow label="Application number" value={data.applicationNumber} />
              <DetailRow label="Application ID" value={<span className="font-mono text-xs">{data.id}</span>} />
              <DetailRow label="Source" value={<CreditSourceBadge source={data.source} />} />
              <DetailRow
                label="Status"
                value={<StatusBadge value={creditApplicationStatusLabel(data.displayStatus ?? data.status)} />}
              />
              <DetailRow label="Submitted" value={data.submittedAt ? formatDateTime(data.submittedAt) : "Not submitted"} />
              <DetailRow label="Created" value={formatDateTime(data.createdAt)} />
              <DetailRow label="Last updated" value={formatDateTime(data.updatedAt)} />
            </dl>
          </Section>

          <Section title="Review">
            <dl>
              <DetailRow label="Assigned admin" value={data.assignedAdminName ?? "Unassigned"} />
              <DetailRow
                label="Review status"
                value={<StatusBadge value={creditApplicationStatusLabel(data.displayStatus ?? data.status)} />}
              />
              {data.status === "REJECTED" ? (
                <DetailRow label="Rejection reason" value={data.decisionReason ?? "—"} />
              ) : null}
              <DetailRow label="Message to customer" value={data.customerMessage ?? "—"} />
            </dl>
            <p className="section-label mb-2 mt-5">Admin remarks</p>
            {(data.remarks ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No remarks yet.</p>
            ) : (
              <ul className="space-y-2">
                {(data.remarks ?? []).map((item) => (
                  <li key={item.id} className="rounded border bg-slate-50 p-2 text-sm">
                    <p className="whitespace-pre-wrap">{item.remark}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.actorName ?? "Admin"} · {formatDateTime(item.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {can("ADD_REMARK") ? (
              <form
                className="mt-3 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const text = remark.trim();
                  if (text.length < 2) return;
                  void run(() => addCreditApplicationRemark(id, text), "Remark added").then((ok) => {
                    if (ok) setRemark("");
                  });
                }}
              >
                <Textarea
                  aria-label="Add an internal remark"
                  value={remark}
                  maxLength={2000}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="Internal remark — never shown to the customer"
                />
                <Button type="submit" size="sm" variant="outline" disabled={busy || remark.trim().length < 2}>
                  Add remark
                </Button>
              </form>
            ) : null}
          </Section>

          <Section title="Business information" className="xl:col-span-2">
            <dl>
              <DetailRow label="Company" value={data.customer.name} />
              <DetailRow label="Business type" value={data.customer.businessType ?? "—"} />
              <DetailRow label="Applicant" value={data.customer.contactName ?? "—"} />
              <DetailRow label="Mobile" value={data.customer.phone ?? "—"} />
              <DetailRow label="Email" value={data.customer.email ?? "—"} />
              <DetailRow label="GSTIN" value={data.customer.gstin ?? "—"} />
              <DetailRow label="PAN" value={data.customer.pan ?? "—"} />
              <DetailRow label="Customer ID" value={<span className="font-mono text-xs">{data.customer.id}</span>} />
            </dl>
            {data.applicationDetails ? <ApplicantDetails details={data.applicationDetails} /> : null}
          </Section>

          <Section title="KYC information">
            <dl>
              <DetailRow
                label="Business KYC"
                value={<StatusBadge value={CREDIT_KYC_LABELS[data.kyc?.status ?? data.kycStatus] ?? "—"} />}
              />
              <KycRow label="GST verification" verification={data.kyc?.gst} />
              <KycRow label="PAN verification" verification={data.kyc?.pan} />
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Identifiers are masked. Full values never leave the backend.</p>
          </Section>

          <Section title="Credit requirement" className="xl:col-span-2">
            <dl>
              <DetailRow label="Requested credit" value={displayMoney(data.requestedLimit)} />
              <DetailRow
                label="Preferred terms"
                value={data.requestedTenureDays ? `${data.requestedTenureDays} days` : "—"}
              />
              {data.applicationDetails?.requirement ? (
                <>
                  <DetailRow
                    label="Monthly procurement"
                    value={displayMoney(data.applicationDetails.requirement.monthlyProcurement)}
                  />
                  <DetailRow
                    label="Time in business"
                    value={data.applicationDetails.requirement.businessDuration ?? "—"}
                  />
                  <DetailRow
                    label="Existing credit facility"
                    value={
                      data.applicationDetails.requirement.existingCreditFacility == null
                        ? "—"
                        : data.applicationDetails.requirement.existingCreditFacility
                          ? `Yes${
                              data.applicationDetails.requirement.existingCreditDetails
                                ? ` — ${data.applicationDetails.requirement.existingCreditDetails}`
                                : ""
                            }`
                          : "No"
                    }
                  />
                </>
              ) : null}
              <DetailRow label="Purpose" value={data.purpose ?? "—"} />
              <DetailRow label="Existing exposure" value={displayMoney(data.existingExposure)} />
            </dl>
          </Section>

          <Section title="Decision">
            <dl>
              <DetailRow label="Approved limit" value={displayMoney(data.approvedLimit)} />
              <DetailRow label="Approved tenure" value={data.approvedTenureDays ? `${data.approvedTenureDays} days` : "—"} />
              <DetailRow label="Decision reason" value={data.decisionReason ?? "—"} />
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
          </Section>

          <Section title="Documents" className="xl:col-span-2">
            {data.storage?.pending ? (
              <p className="mb-3 text-xs text-amber-700">
                Document storage is not connected. File references are retained; downloads are pending.
              </p>
            ) : null}
            {(data.documents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No credit documents found.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(data.documents ?? []).map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    canMutate={canMutate}
                    onOpen={() => void onOpenDocument(doc.id)}
                    onVerify={() => void run(() => verifyCreditApplicationDocument(id, doc.id), "Document verified")}
                    onReject={() => setDocumentToReject(doc)}
                  />
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Links are short-lived signed URLs issued after an authorization check; every access is audited.
            </p>
          </Section>

          <Section title="Insurance & credit arrangement">
            <dl>
              <DetailRow
                label="Insurance status"
                value={data.insuranceStatus ? <StatusBadge value={humanizeCreditStatus(data.insuranceStatus)} /> : "—"}
              />
              <DetailRow
                label="Arrangement status"
                value={data.arrangementStatus ? <StatusBadge value={humanizeCreditStatus(data.arrangementStatus)} /> : "—"}
              />
              {data.insurancePartner ? <DetailRow label="Insurance partner" value={data.insurancePartner} /> : null}
              {data.insuranceReference ? <DetailRow label="Reference" value={data.insuranceReference} /> : null}
              {data.insuredAmount ? <DetailRow label="Insured amount" value={displayMoney(data.insuredAmount)} /> : null}
              {data.effectiveAt ? <DetailRow label="Effective from" value={formatDateTime(data.effectiveAt)} /> : null}
              {data.expiresAt ? <DetailRow label="Expires at" value={formatDateTime(data.expiresAt)} /> : null}
            </dl>
          </Section>

          <Section title="Application timeline" className="xl:col-span-2">
            {timelineQuery.error ? <p className="mb-3 text-xs text-amber-700">{timelineQuery.error}</p> : null}
            {timelineQuery.loading && timelineEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading timeline…</p>
            ) : (
              <ActivityTimeline
                items={[...timelineEvents].reverse().map((item) => ({
                  id: item.id,
                  title: humanizeCreditAction(item.eventType),
                  detail: [
                    item.description,
                    statusChange(item),
                    item.actorName ?? (item.actorRole ? humanizeCreditStatus(item.actorRole) : null),
                    item.customerVisible ? "Customer visible" : "Internal",
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  time: item.createdAt,
                }))}
              />
            )}
          </Section>

          <Section title="Audit log">
            <ActivityTimeline
              items={(data.audit ?? []).map((item) => ({
                id: item.id,
                title: humanizeCreditAction(item.action),
                detail: item.actor,
                time: item.createdAt,
              }))}
            />
          </Section>
        </div>
      ) : null}

      <CreditReasonDialog
        open={dialog === "approve"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Approve credit"
        description="Assign a platform credit limit. This does not create seller credit."
        confirmLabel="Approve"
        amountLabel="Approved limit (INR)"
        amountRequired
        onConfirm={({ reason, amount }) => {
          if (amount == null) return;
          void run(() => approveCreditApplication(id, { approvedLimit: amount, reason }), "Credit application approved");
          setDialog(null);
        }}
      />
      <CreditReasonDialog
        open={dialog === "partial"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Partially approve credit"
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
        }}
      />
      <CreditReasonDialog
        open={dialog === "reject"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Reject credit application"
        description="The customer is notified with this reason and can re-apply later."
        confirmLabel="Reject"
        reasonLabel="Rejection reason"
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
        description="Ask the customer for additional KYC or financial documents. They are notified."
        confirmLabel="Request"
        reasonLabel="Message to the customer"
        onConfirm={({ reason }) => {
          void run(() => requestCreditDocuments(id, { message: reason }), "Documents requested");
          setDialog(null);
        }}
      />
      <CreditReasonDialog
        open={dialog === "resubmission"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Request resubmission"
        description="Reopens the application so the customer can correct it and submit again. They see this message."
        confirmLabel="Request resubmission"
        reasonLabel="What should the customer change?"
        reasonPlaceholder="e.g. The bank statement is for the wrong account. Upload the current account statement."
        minReasonLength={5}
        onConfirm={({ reason }) => {
          void run(() => requestCreditResubmission(id, reason), "Resubmission requested");
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
      <CreditAssignDialog
        open={dialog === "assign"}
        onOpenChange={(open) => !open && setDialog(null)}
        currentAssigneeId={data?.assignedAdminId ?? null}
        onConfirm={(assigneeUserId) => {
          void run(() => assignCreditApplication(id, assigneeUserId), "Application assigned");
          setDialog(null);
        }}
      />
    </div>
  );

  function handleAction(action: CreditAdminAction | "ASSIGN_SELF") {
    switch (action) {
      case "ASSIGN_SELF":
        void run(() => assignCreditApplication(id), "Assigned to you");
        return;
      case "START_REVIEW":
        void run(() => startCreditReview(id), "Review started");
        return;
      case "REQUEST_DOCUMENTS":
        setDialog("documents");
        return;
      case "REQUEST_RESUBMISSION":
        setDialog("resubmission");
        return;
      case "SEND_INSURANCE_REVIEW":
        setDialog("insurance");
        return;
      case "MARK_ARRANGEMENT_PENDING":
        setDialog("arrangement");
        return;
      case "PARTIAL_APPROVE":
        setDialog("partial");
        return;
      case "APPROVE":
        setDialog("approve");
        return;
      case "REJECT":
        setDialog("reject");
        return;
      case "ASSIGN":
        setDialog("assign");
        return;
      default:
        return;
    }
  }
}

function ActionBar({
  data,
  can,
  busy,
  assignedToMe,
  onAction,
}: {
  data: CreditApplication;
  can: (action: CreditAdminAction) => boolean;
  busy: boolean;
  assignedToMe: boolean;
  onAction: (action: CreditAdminAction | "ASSIGN_SELF") => void;
}) {
  const buttons: Array<{
    action: CreditAdminAction | "ASSIGN_SELF";
    label: string;
    variant?: "outline" | "default" | "destructive";
    show: boolean;
  }> = [
    { action: "ASSIGN_SELF", label: "Assign to me", show: can("ASSIGN") && !assignedToMe },
    { action: "ASSIGN", label: data.assignedAdminId ? "Reassign" : "Assign", show: can("ASSIGN") },
    { action: "START_REVIEW", label: "Start Review", show: can("START_REVIEW") },
    { action: "REQUEST_DOCUMENTS", label: "Request Documents", show: can("REQUEST_DOCUMENTS") },
    { action: "REQUEST_RESUBMISSION", label: "Request Resubmission", show: can("REQUEST_RESUBMISSION") },
    { action: "SEND_INSURANCE_REVIEW", label: "Send to Insurance Review", show: can("SEND_INSURANCE_REVIEW") },
    { action: "MARK_ARRANGEMENT_PENDING", label: "Mark Arrangement Pending", show: can("MARK_ARRANGEMENT_PENDING") },
    { action: "PARTIAL_APPROVE", label: "Partial Approve", show: can("PARTIAL_APPROVE") },
    { action: "APPROVE", label: "Approve", variant: "default", show: can("APPROVE") },
    { action: "REJECT", label: "Reject", variant: "destructive", show: can("REJECT") },
  ];
  const visible = buttons.filter((button) => button.show);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CreditSourceBadge source={data.source} />
      <StatusBadge value={creditApplicationStatusLabel(data.displayStatus ?? data.status)} />
      {visible.map((button) => (
        <Button
          key={button.action}
          size="sm"
          variant={button.variant ?? "outline"}
          disabled={busy}
          onClick={() => onAction(button.action)}
        >
          {button.label}
        </Button>
      ))}
    </div>
  );
}
