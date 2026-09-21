"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
  getCreditApplication,
  rejectCreditApplication,
  requestCreditDocuments,
  startCreditReview,
} from "@/lib/api/credit";
import { canMutateCredit, creditErrorMessage, displayMoney, humanizeCreditAction } from "@/lib/credit-format";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";

export default function CreditApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const user = useAuthStore((s) => s.user);
  const canMutate = canMutateCredit(user?.role);
  const { data, error, loading, reload } = useCreditQuery(() => getCreditApplication(id), [id]);
  const [dialog, setDialog] = useState<"approve" | "reject" | "documents" | null>(null);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      reload();
    } catch (err) {
      toast.error(creditErrorMessage(err, "Unable to update the credit application."));
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
              <DetailRow label="Status" value={<StatusBadge value={data.status} />} />
              <DetailRow label="Assigned admin" value={data.assignedAdminName ?? "Unassigned"} />
            </dl>
          </section>
          <section className="rounded-md border bg-white p-4">
            <p className="section-label mb-3">Decision</p>
            <dl>
              <DetailRow label="Approved limit" value={displayMoney(data.approvedLimit)} />
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
                  <li key={doc.id} className="flex items-center justify-between gap-2 border-b py-2 last:border-0">
                    <span>
                      {doc.fileName} · {doc.category}
                    </span>
                    <StatusBadge value={doc.status} />
                  </li>
                ))}
              </ul>
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
    </div>
  );
}
