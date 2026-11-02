"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EditOfferPriceDialog } from "@/components/offers/edit-offer-price-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { formatInr, kgFromMt } from "@/lib/price-units";
import {
  approveAdminOffer,
  listAdminOffers,
  rejectAdminOffer,
  suspendAdminOffer,
  updateAdminOfferPrice,
} from "@/lib/api/ops";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type { Offer } from "@/types";

export default function OffersPage() {
  const rows = useDataStore((s) => s.offers);
  const updateOffer = useDataStore((s) => s.updateOffer);
  const pushAudit = useDataStore((s) => s.pushAudit);
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState<{ id: string; status: Offer["status"] } | null>(null);
  const [priceOffer, setPriceOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      useDataStore.setState({ offers: await listAdminOffers() });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load offers.");
      useDataStore.setState({ offers: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <EntityWorkbench
        title="Offers"
        description="Admin visibility over seller offers from Seller App and Seller Web App."
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load()}
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          { key: "id", header: "Offer #", sortable: true, accessor: (r) => r.offerNumber ?? r.id },
          { key: "seller", header: "Seller", sortable: true, accessor: (r) => r.seller },
          { key: "grade", header: "Grade", accessor: (r) => r.grade },
          {
            key: "price",
            header: "Selling Price / MT",
            sortable: true,
            accessor: (r) => r.price,
            render: (r) => (
              <span className="inline-flex flex-col gap-0.5">
                <span>{`₹${r.price.toLocaleString("en-IN")} / MT`}</span>
                {r.needsPriceReview ? (
                  <span className="text-[11px] font-medium text-amber-700">Needs price review</span>
                ) : null}
              </span>
            ),
          },
          { key: "qty", header: "Quantity", sortable: true, accessor: (r) => r.quantity },
          { key: "validity", header: "Validity", render: (r) => formatDate(r.validity) },
          { key: "location", header: "Warehouse", accessor: (r) => r.location },
          {
            key: "deliveryEstimate",
            header: "Delivery ETA",
            accessor: (r) => r.deliveryEstimate ?? "—",
          },
          { key: "status", header: "Status", render: (r) => <StatusBadge value={r.status} /> },
          { key: "source", header: "Source", render: (r) => <SourceBadge source={r.source} /> },
        ]}
        searchPlaceholder="Search offers"
        searchFn={(r, q) =>
          `${r.offerNumber ?? ""} ${r.id} ${r.seller} ${r.grade} ${r.location} ${r.deliveryEstimate ?? ""}`
            .toLowerCase()
            .includes(q)
        }
        filters={[
          { label: "Draft", value: "Draft", predicate: (r) => r.status === "Draft" },
          { label: "Pending Review", value: "Pending Review", predicate: (r) => r.status === "Pending Review" },
          {
            label: "Needs Price Review",
            value: "Needs Price Review",
            predicate: (r) => Boolean(r.needsPriceReview),
          },
          { label: "Active", value: "Active", predicate: (r) => r.status === "Active" },
          { label: "Paused", value: "Paused", predicate: (r) => r.status === "Paused" },
          { label: "Expired", value: "Expired", predicate: (r) => r.status === "Expired" },
          { label: "Rejected", value: "Rejected", predicate: (r) => r.status === "Rejected" },
        ]}
        emptyTitle="No offers found."
        emptyDescription="Seller offers from Seller App and Seller Web App will appear here."
        exportName="offers"
        exportRow={(r) => ({ id: r.id, seller: r.seller, grade: r.grade, status: r.status, source: r.source })}
        drawerTitle={(r) => r.offerNumber ?? r.id}
        renderDetails={(r) => (
          <dl>
            <DetailRow label="Offer #" value={r.offerNumber ?? r.id} />
            <DetailRow label="Seller" value={r.seller} />
            <DetailRow label="Grade" value={r.grade} />
            <DetailRow
              label="Selling price"
              value={`₹${formatInr(r.price, 0)} / MT · ₹${formatInr(kgFromMt(r.price), 4)} / kg`}
            />
            <DetailRow label="Bulk selling price" value={`₹${formatInr(r.bulkPrice, 0)} / MT`} />
            <DetailRow
              label="Price review"
              value={
                r.needsPriceReview
                  ? r.priceReviewReason ?? "Material price looks commercially unusual — verify before relying on marketplace display."
                  : "Verified range"
              }
            />
            <DetailRow
              label="Checkout note"
              value="Order total = material + freight (~₹1,250/MT) + GST. A ₹10/MT listing makes freight dominate (e.g. ~₹14,862 for 10 MT)."
            />
            <DetailRow label="Remarks" value={r.remarks} />
            <DetailRow label="Warehouse" value={r.location} />
            <DetailRow label="Dispatch within" value={r.dispatchWindow ?? "24 Hours"} />
            <DetailRow label="Estimated delivery" value={r.deliveryEstimate ?? "—"} />
            <DetailRow label="Validity" value={formatDate(r.validity)} />
            <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
          </dl>
        )}
        drawerFooter={(r) => (
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => setPriceOffer(r)}>
              Edit price / MT
            </Button>
            <Button size="sm" onClick={() => setPending({ id: r.id, status: "Active" })}>Approve / Activate</Button>
            <Button size="sm" variant="destructive" onClick={() => setPending({ id: r.id, status: "Rejected" })}>Reject</Button>
            <Button size="sm" variant="outline" onClick={() => setPending({ id: r.id, status: "Paused" })}>Pause</Button>
            <Button
              size="sm"
              variant="outline"
              className="col-span-2"
              onClick={() => setPending({ id: r.id, status: "Pending Review" })}
            >
              Request Revision
            </Button>
          </div>
        )}
      />
      <EditOfferPriceDialog
        open={Boolean(priceOffer)}
        offer={priceOffer}
        onOpenChange={(open) => !open && setPriceOffer(null)}
        onSubmit={async (input) => {
          if (!priceOffer) return;
          try {
            const updated = await updateAdminOfferPrice(priceOffer.id, input);
            updateOffer(priceOffer.id, {
              price: updated.price,
              bulkPrice: updated.bulkPrice,
              needsPriceReview: updated.needsPriceReview,
              priceReviewReason: updated.priceReviewReason,
            });
            pushAudit({
              admin: user?.name ?? "Admin",
              role: user?.role ?? "ADMIN",
              action: `Updated offer ${priceOffer.offerNumber ?? priceOffer.id} price to ₹${updated.price}/MT`,
              module: "Offers",
              entity: priceOffer.id,
              result: "Success",
            });
            toast.success("Material price updated");
            await load();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update price.");
            throw error;
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title="Update offer"
        description="Offer status changes are Admin Portal actions and are written to the audit log."
        destructive={pending?.status === "Rejected"}
        onConfirm={async () => {
          if (!pending) return;
          try {
            if (pending.status === "Active") await approveAdminOffer(pending.id);
            else if (pending.status === "Rejected") await rejectAdminOffer(pending.id);
            else if (pending.status === "Paused") await suspendAdminOffer(pending.id);
            updateOffer(pending.id, { status: pending.status });
            pushAudit({ admin: user?.name ?? "Admin", role: user?.role ?? "ADMIN", action: `Set offer ${pending.id} to ${pending.status}`, module: "Offers", entity: pending.id, result: "Success" });
            toast.success("Offer updated");
            await load();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update offer.");
          }
          setPending(null);
        }}
      />
    </>
  );
}
