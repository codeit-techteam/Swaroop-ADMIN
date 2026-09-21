"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CreditReasonDialog } from "@/components/credit/credit-reason-dialog";
import { CreditTable } from "@/components/credit/credit-table";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { DetailRow } from "@/components/shared/detail-drawer";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { adjustCreditLimit, getCreditAccount, reactivateCreditAccount, suspendCreditAccount } from "@/lib/api/credit";
import { canMutateCredit, creditErrorMessage, displayMoney, displayPercent, humanizeCreditAction } from "@/lib/credit-format";
import { formatDate } from "@/lib/format";
import { useAuthStore } from "@/store/auth-store";

export default function CreditAccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const canMutate = canMutateCredit(user?.role);
  const { data, error, loading, reload } = useCreditQuery(() => getCreditAccount(id), [id]);
  const [dialog, setDialog] = useState<"limit" | "suspend" | "reactivate" | null>(null);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      reload();
    } catch (err) {
      toast.error(creditErrorMessage(err, "Unable to update the credit account."));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={data?.accountNumber ?? "Credit account"}
        description="PetroTrade credit account"
        breadcrumbs={[
          { label: "Credit Management", href: "/credit" },
          { label: "Accounts", href: "/credit/accounts" },
          { label: data?.accountNumber ?? "Detail" },
        ]}
        actions={
          canMutate && data ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setDialog("limit")}>
                Adjust Limit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDialog("suspend")}>
                Suspend
              </Button>
              <Button size="sm" onClick={() => setDialog("reactivate")}>
                Reactivate
              </Button>
            </div>
          ) : null
        }
      />
      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit account…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : data ? (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-md border bg-white p-4 xl:col-span-2">
              <p className="section-label mb-3">Credit limit</p>
              <dl>
                <DetailRow label="Customer" value={data.customer.name} />
                <DetailRow label="Credit account ID" value={data.accountNumber ?? data.id} />
                <DetailRow label="Approved limit" value={displayMoney(data.approvedLimit)} />
                <DetailRow label="Available limit" value={displayMoney(data.availableLimit)} />
                <DetailRow label="Utilized amount" value={displayMoney(data.utilizedAmount)} />
                <DetailRow label="Outstanding" value={displayMoney(data.outstandingAmount)} />
                <DetailRow label="Overdue" value={displayMoney(data.overdueAmount)} />
                <DetailRow label="Utilization" value={displayPercent(data.utilizationPercentage)} />
                <DetailRow label="Tenure" value={data.creditTermDays ? `${data.creditTermDays} days` : "—"} />
                <DetailRow label="Status" value={<StatusBadge value={data.accountStatus} />} />
                <DetailRow label="Effective" value={data.effectiveAt ? formatDate(data.effectiveAt) : "—"} />
                <DetailRow label="Review date" value={data.reviewAt ? formatDate(data.reviewAt) : "—"} />
              </dl>
            </section>
            <section className="rounded-md border bg-white p-4">
              <p className="section-label mb-3">Insurance</p>
              {data.insurance ? (
                <dl>
                  <DetailRow label="Status" value={<StatusBadge value={data.insurance.status} />} />
                  <DetailRow label="Provider" value={data.insurance.providerName ?? "Not connected"} />
                  <DetailRow label="Policy" value={data.insurance.policyNumber ?? "—"} />
                  <DetailRow label="Coverage" value={displayMoney(data.insurance.coverageAmount)} />
                  <DetailRow label="Integration" value="Pending" />
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No insurance record. Provider integration is pending.</p>
              )}
            </section>
          </div>

          <section className="rounded-md border bg-white p-4">
            <p className="section-label mb-3">Purchase orders using credit</p>
            <CreditTable
              rows={data.purchaseOrders ?? []}
              getRowId={(row) => row.id}
              emptyTitle="No credit-linked purchase orders."
              emptyDescription="Orders paid with Credit — PetroTrade Managed will appear here."
              columns={[
                { key: "po", header: "Purchase Order", accessor: (r) => r.referenceNumber },
                { key: "method", header: "Payment Method", accessor: (r) => r.paymentMethodLabel },
                { key: "amount", header: "Order Amount", render: (r) => displayMoney(r.totalAmount) },
                { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
              ]}
            />
            {(data.purchaseOrders ?? []).map((po) => (
              <div key={`${po.id}-sched`} className="mt-4 rounded border p-3">
                <p className="mb-2 text-sm font-medium">
                  {po.referenceNumber} payment schedule
                </p>
                <CreditTable
                  rows={po.schedules}
                  getRowId={(row) => row.id}
                  emptyTitle="No payment schedule."
                  emptyDescription="Schedules come from the existing finance engine."
                  columns={[
                    { key: "seq", header: "Installment", accessor: (r) => r.sequence },
                    { key: "amt", header: "Amount", render: (r) => displayMoney(r.amount) },
                    { key: "due", header: "Due Date", render: (r) => (r.dueAt ? formatDate(r.dueAt) : "—") },
                    { key: "paid", header: "Paid", render: (r) => displayMoney(r.paidAmount) },
                    { key: "remain", header: "Remaining", render: (r) => displayMoney(r.remainingAmount) },
                    { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
                  ]}
                />
              </div>
            ))}
          </section>

          <section className="rounded-md border bg-white p-4">
            <p className="section-label mb-3">Transactions</p>
            <CreditTable
              rows={data.transactions ?? []}
              getRowId={(row) => row.id}
              emptyTitle="No credit transactions."
              emptyDescription="Ledger events are recorded by the backend."
              columns={[
                { key: "id", header: "Transaction ID", accessor: (r) => r.transactionNumber },
                { key: "type", header: "Type", render: (r) => <StatusBadge value={r.type} /> },
                { key: "amount", header: "Amount", render: (r) => displayMoney(r.amount) },
                { key: "ref", header: "Reference", accessor: (r) => r.referenceId ?? "—" },
                { key: "by", header: "Created By", accessor: (r) => r.createdBy },
                { key: "date", header: "Date", render: (r) => formatDate(r.createdAt) },
              ]}
            />
          </section>

          <section className="rounded-md border bg-white p-4">
            <p className="section-label mb-3">Audit trail</p>
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
        </>
      ) : null}

      <CreditReasonDialog
        open={dialog === "limit"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Adjust credit limit"
        description="The previous limit is preserved in the audit trail. Backend validation is authoritative."
        confirmLabel="Update limit"
        amountLabel="New limit (INR)"
        amountRequired
        onConfirm={({ reason, amount }) => {
          if (amount == null) return;
          void run(() => adjustCreditLimit(id, { newLimit: amount, reason }), "Credit limit updated");
          setDialog(null);
        }}
      />
      <CreditReasonDialog
        open={dialog === "suspend"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Suspend credit"
        description="The customer will not be able to use PetroTrade credit until reactivated."
        confirmLabel="Suspend"
        destructive
        onConfirm={({ reason }) => {
          void run(() => suspendCreditAccount(id, reason), "Credit account suspended");
          setDialog(null);
        }}
      />
      <CreditReasonDialog
        open={dialog === "reactivate"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Reactivate credit"
        description="Restores an approved PetroTrade credit account to ACTIVE."
        confirmLabel="Reactivate"
        onConfirm={({ reason }) => {
          void run(() => reactivateCreditAccount(id, reason), "Credit account reactivated");
          setDialog(null);
        }}
      />
    </div>
  );
}
