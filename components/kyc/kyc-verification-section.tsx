"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";

import { DetailRow } from "@/components/shared/detail-drawer";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";
import type { AdminKycBusiness, AdminKycDetail, AdminKycVerification } from "@/types";

const DETAIL_LABELS: Record<string, string> = {
  nameOnPan: "Name on PAN",
  panStatus: "PAN status",
  panCategory: "Category",
  legalName: "Legal name",
  tradeName: "Trade name",
  gstStatus: "GST status",
  registrationDate: "Registered on",
  taxpayerType: "Taxpayer type",
  constitution: "Constitution",
  address: "Principal address",
  state: "State",
  stateCode: "State code",
  pincode: "Pincode",
  panMasked: "Linked PAN",
  cancellationDate: "Cancelled on",
};

function VerificationCard({ label, verification }: { label: string; verification: AdminKycVerification | null }) {
  if (!verification) {
    return (
      <div className="rounded-md border border-dashed p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-800">{label}</p>
          <StatusBadge value="Missing" />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          No verification on record. Confirm the number against the uploaded document before approving.
        </p>
      </div>
    );
  }
  const facts = Object.entries(verification.details).filter(([key]) => key in DETAIL_LABELS);
  const when = verification.reviewedAt ?? verification.verifiedAt ?? verification.createdAt;
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">
          {label} <span className="font-mono text-slate-600">{verification.identifierMasked}</span>
        </p>
        <StatusBadge value={verification.status} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {verification.status === "Verified"
          ? verification.method === "Manual"
            ? `Confirmed manually by compliance · ${formatDateTime(when)}`
            : `Verified via ${verification.provider} · ${formatDateTime(when)}`
          : `${verification.message} · ${formatDateTime(when)}`}
      </p>
      {verification.failureCode && verification.status !== "Verified" ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">Code: {verification.failureCode}</p>
      ) : null}
      {verification.source || verification.providerReference ? (
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {[
            verification.source ? `Source: ${verification.source}` : null,
            verification.providerReference ? `Ref: ${verification.providerReference}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      {facts.length ? (
        <dl className="mt-2 grid gap-x-4 gap-y-1 rounded bg-slate-50 p-2 text-xs sm:grid-cols-2">
          {facts.map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-muted-foreground">{DETAIL_LABELS[key]}</dt>
              <dd className="break-words font-medium text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function BusinessDetails({ business }: { business: AdminKycBusiness }) {
  const rows: Array<[string, string | null]> = [
    ["Business name", business.name],
    ["Legal name", business.legalName],
    ["Trade name", business.tradeName],
    ["Business type", business.businessType],
    ["Constitution", business.constitution],
    ["Address", [business.address, business.state, business.pincode].filter(Boolean).join(", ") || null],
  ];
  const shown = rows.filter((row): row is [string, string] => Boolean(row[1]));
  if (!shown.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-900">Business information</h3>
      <dl className="rounded-md border px-3">
        {shown.map(([label, value]) => (
          <DetailRow key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

/** PAN / GSTIN verification results recorded by the backend, plus the business profile they produced. */
export function KycVerificationSection({ detail }: { detail: AdminKycDetail }) {
  const verifications = detail.verifications;
  if (!verifications) return null;
  const history = verifications.history.filter(
    (row) => row.id !== verifications.pan?.id && row.id !== verifications.gst?.id,
  );
  return (
    <>
      {detail.business ? <BusinessDetails business={detail.business} /> : null}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <ShieldCheck className="size-4 text-slate-500" /> PAN &amp; GST verification
        </h3>
        <div className="grid gap-2">
          <VerificationCard label="PAN" verification={verifications.pan} />
          <VerificationCard label="GSTIN" verification={verifications.gst} />
        </div>
        {verifications.mismatch ? (
          <p className="mt-2 flex items-start gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            GST/PAN mismatch: the PAN associated with the GSTIN does not match the verified PAN. KYC cannot be
            approved until the customer or seller verifies matching details.
          </p>
        ) : null}
        {detail.warnings.length ? (
          <ul className="mt-2 grid gap-1">
            {detail.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {warning}
              </li>
            ))}
          </ul>
        ) : null}
        {history.length ? (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              {history.length} earlier verification attempt{history.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-1 divide-y rounded-md border">
              {history.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <span>
                    {row.type} <span className="font-mono">{row.identifierMasked}</span> ·{" "}
                    {formatDateTime(row.createdAt)}
                  </span>
                  <StatusBadge value={row.status} />
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    </>
  );
}
