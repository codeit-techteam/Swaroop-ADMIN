"use client";

import Link from "next/link";

import { useCreditQuery } from "@/components/credit/use-credit-query";
import { DetailRow } from "@/components/shared/detail-drawer";
import { StatusBadge } from "@/components/shared/status-badge";
import { getCustomerCredit } from "@/lib/api/credit";
import { displayMoney } from "@/lib/credit-format";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function CustomerCreditPanel({ customerId }: { customerId: string }) {
  const live = UUID_RE.test(customerId);
  const { data, error, loading } = useCreditQuery(
    () => (live ? getCustomerCredit(customerId) : Promise.resolve(null)),
    [customerId, live],
  );

  if (!live) {
    return (
      <DetailRow
        label="Credit"
        value={
          <Link href="/credit" className="text-primary">
            Open Credit Management
          </Link>
        }
      />
    );
  }

  if (loading) {
    return <DetailRow label="Credit" value="Loading credit information…" />;
  }
  if (error) {
    return <DetailRow label="Credit" value="Unable to load credit information. Please try again." />;
  }
  if (!data?.account) {
    return (
      <DetailRow
        label="Credit"
        value={`No PetroTrade credit account · ${data?.applicationStatus ?? "NOT_APPLIED"}`}
      />
    );
  }

  return (
    <>
      <DetailRow label="Credit status" value={<StatusBadge value={data.account.accountStatus} />} />
      <DetailRow label="Application" value={<StatusBadge value={data.applicationStatus} />} />
      <DetailRow label="Credit limit" value={displayMoney(data.account.approvedLimit)} />
      <DetailRow label="Available" value={displayMoney(data.account.availableLimit)} />
      <DetailRow label="Utilized" value={displayMoney(data.account.utilizedAmount)} />
      <DetailRow label="Outstanding" value={displayMoney(data.account.outstandingAmount)} />
      <DetailRow label="Overdue" value={displayMoney(data.account.overdueAmount)} />
      <DetailRow
        label="Account"
        value={
          <Link href={`/credit/accounts/${data.account.id}`} className="text-primary">
            {data.account.accountNumber ?? "Open account"}
          </Link>
        }
      />
    </>
  );
}
