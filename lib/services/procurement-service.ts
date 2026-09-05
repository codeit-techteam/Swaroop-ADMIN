import { delay } from "@/lib/utils";
import {
  appendTimeline,
  gstBreakdown,
  nextProcurementId,
  withAliases,
} from "@/lib/procurement";
import { procurementQueue } from "@/lib/mock-data/procurement";
import type {
  Procurement,
  ProcurementDispatchInfo,
  ProcurementStatus,
  SupplierQuotation,
} from "@/types";

function nowIso() {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export interface CreateProcurementInput {
  customerId: string;
  customerName: string;
  commodity: string;
  grade: string;
  quantity: number;
  unit?: string;
  requiredDeliveryDate: string;
  deliveryLocation: string;
  preferredSupplier?: string;
  preferredSellerId?: string;
  paymentTerms: string;
  remarks?: string;
  estimatedCost?: number;
}

export interface CounterOfferInput {
  counterPrice: number;
  remarks: string;
}

export interface CreatePoInput {
  poNumber: string;
  sellerName: string;
  sellerId?: string;
  customerName: string;
  commodity: string;
  grade: string;
  quantity: number;
  price: number;
  taxRate?: number;
  deliveryLocation: string;
  paymentTerms: string;
  expectedDelivery: string;
  remarks?: string;
}

export interface CreateDispatchInput {
  vehicle: string;
  driver: string;
  loadingLocation: string;
  destination: string;
  dispatchDate: string;
  expectedArrival: string;
}

function stamp(item: Procurement, status: ProcurementStatus, extra: Partial<Procurement> = {}): Procurement {
  return withAliases({
    ...item,
    ...extra,
    status,
    updatedAt: nowIso(),
  });
}

export const procurementService = {
  async getProcurements() {
    await delay(80);
    return clone(procurementQueue);
  },

  async getProcurementById(id: string) {
    await delay(80);
    return clone(procurementQueue.find((item) => item.id === id) ?? null);
  },

  createProcurement(existing: Procurement[], input: CreateProcurementInput, mode: "draft" | "submit", actor: string) {
    const status: ProcurementStatus = mode === "draft" ? "Draft" : "Submitted";
    const createdAt = nowIso();
    const estimatedCost = input.estimatedCost ?? input.quantity * 8000;
    const item = withAliases({
      id: nextProcurementId(existing),
      customerId: input.customerId,
      customerName: input.customerName,
      sellerId: input.preferredSellerId,
      sellerName: input.preferredSupplier || undefined,
      commodity: input.commodity,
      grade: input.grade,
      quantity: input.quantity,
      unit: input.unit ?? "MT",
      estimatedCost,
      status,
      deliveryLocation: input.deliveryLocation,
      requestedDate: createdAt,
      requiredDeliveryDate: input.requiredDeliveryDate,
      paymentTerms: input.paymentTerms,
      creditTerms: input.paymentTerms,
      createdAt,
      updatedAt: createdAt,
      source: "Admin Portal",
      remarks: input.remarks,
      quotations: [],
      timeline: [
        {
          id: `TL-new-1`,
          title: mode === "draft" ? "Draft Saved" : "Purchase Request Created",
          status,
          actor,
          description:
            mode === "draft"
              ? "Procurement draft saved from Admin Portal."
              : "Procurement submitted from Admin Portal.",
          timestamp: createdAt,
        },
      ],
    });
    return item;
  },

  updateProcurement(item: Procurement, patch: Partial<Procurement>) {
    return withAliases({ ...item, ...patch, updatedAt: nowIso() });
  },

  approveProcurement(item: Procurement, actor: string) {
    const timestamp = nowIso();
    return stamp(item, "Approved", {
      timeline: appendTimeline(item, {
        title: "Approved",
        status: "Approved",
        actor,
        description: "Procurement request approved.",
        timestamp,
      }),
    });
  },

  rejectProcurement(item: Procurement, actor: string, reason: string) {
    const timestamp = nowIso();
    return stamp(item, "Rejected", {
      remarks: reason,
      timeline: appendTimeline(item, {
        title: "Rejected",
        status: "Rejected",
        actor,
        description: reason,
        timestamp,
      }),
    });
  },

  sendBackProcurement(item: Procurement, actor: string, comments: string) {
    const timestamp = nowIso();
    return stamp(item, "Under Review", {
      remarks: comments,
      timeline: appendTimeline(item, {
        title: "Sent Back",
        status: "Under Review",
        actor,
        description: comments,
        timestamp,
      }),
    });
  },

  startNegotiation(item: Procurement, actor: string) {
    const timestamp = nowIso();
    const latest = item.negotiatedPrice ?? Math.round(item.estimatedCost / Math.max(item.quantity, 1));
    return stamp(item, "Negotiation", {
      negotiation: item.negotiation ?? {
        initialPrice: latest,
        latestPrice: latest,
        adminTargetPrice: Math.round(latest * 0.97),
        quantity: item.quantity,
        status: "Open",
      },
      timeline: appendTimeline(item, {
        title: "Negotiation Started",
        status: "Negotiation",
        actor,
        description: "Price negotiation opened.",
        timestamp,
      }),
    });
  },

  submitCounterOffer(item: Procurement, input: CounterOfferInput, actor: string) {
    const timestamp = nowIso();
    const quantity = item.negotiation?.quantity ?? item.quantity;
    const initial = item.negotiation?.initialPrice ?? Math.round(item.estimatedCost / Math.max(quantity, 1));
    return stamp(item, "Negotiation", {
      negotiatedPrice: input.counterPrice,
      estimatedCost: input.counterPrice * quantity,
      negotiation: {
        initialPrice: initial,
        latestPrice: input.counterPrice,
        adminTargetPrice: input.counterPrice,
        quantity,
        status: "Countered",
        remarks: input.remarks,
      },
      timeline: appendTimeline(item, {
        title: "Price Revised",
        status: "Negotiation",
        actor,
        description: `Counter offer submitted at ${input.counterPrice} / ${item.unit}. ${input.remarks}`,
        timestamp,
      }),
    });
  },

  acceptNegotiation(item: Procurement, actor: string) {
    const timestamp = nowIso();
    const latest = item.negotiation?.latestPrice ?? item.negotiatedPrice ?? 0;
    return stamp(item, "Pending Approval", {
      negotiatedPrice: latest,
      estimatedCost: latest * (item.negotiation?.quantity ?? item.quantity),
      negotiation: item.negotiation ? { ...item.negotiation, status: "Accepted" } : item.negotiation,
      timeline: appendTimeline(item, {
        title: "Approval Pending",
        status: "Pending Approval",
        actor,
        description: "Negotiated price accepted. Moved to approval.",
        timestamp,
      }),
    });
  },

  rejectNegotiation(item: Procurement, actor: string) {
    const timestamp = nowIso();
    return stamp(item, "Rejected", {
      negotiation: item.negotiation ? { ...item.negotiation, status: "Rejected" } : item.negotiation,
      timeline: appendTimeline(item, {
        title: "Negotiation Rejected",
        status: "Rejected",
        actor,
        description: "Admin rejected the latest supplier price.",
        timestamp,
      }),
    });
  },

  selectPreferredSupplier(item: Procurement, quotation: SupplierQuotation, actor: string) {
    const timestamp = nowIso();
    return stamp(item, item.status === "Draft" || item.status === "Submitted" ? "Under Review" : item.status, {
      sellerId: quotation.sellerId,
      sellerName: quotation.supplier,
      estimatedCost: quotation.total,
      negotiatedPrice: quotation.pricePerMt,
      grade: quotation.grade,
      quantity: quotation.quantity,
      unit: quotation.unit,
      paymentTerms: quotation.paymentTerms,
      quotations: item.quotations.map((quote) => ({
        ...quote,
        selected: quote.id === quotation.id,
        status: quote.id === quotation.id ? "Selected" : quote.status === "Selected" ? "Quoted" : quote.status,
      })),
      timeline: appendTimeline(item, {
        title: "Supplier Identified",
        status: item.status,
        actor,
        description: `${quotation.supplier} selected as preferred supplier.`,
        timestamp,
      }),
    });
  },

  createPO(item: Procurement, input: CreatePoInput, actor: string) {
    const timestamp = nowIso();
    const subtotal = input.quantity * input.price;
    const { total } = gstBreakdown(subtotal, input.taxRate ?? 0.18);
    return stamp(item, "PO Created", {
      poNumber: input.poNumber,
      sellerName: input.sellerName,
      sellerId: input.sellerId ?? item.sellerId,
      customerName: input.customerName,
      commodity: input.commodity,
      grade: input.grade,
      quantity: input.quantity,
      estimatedCost: total,
      negotiatedPrice: input.price,
      deliveryLocation: input.deliveryLocation,
      paymentTerms: input.paymentTerms,
      requiredDeliveryDate: input.expectedDelivery,
      remarks: input.remarks ?? item.remarks,
      timeline: appendTimeline(item, {
        title: "PO Created",
        status: "PO Created",
        actor,
        description: `Purchase order ${input.poNumber} created. Awaiting seller confirmation.`,
        timestamp,
      }),
    });
  },

  confirmSeller(item: Procurement, outcome: "accepted" | "rejected" | "revision", actor: string) {
    const timestamp = nowIso();
    if (outcome === "accepted") {
      return stamp(item, "Seller Confirmed", {
        timeline: appendTimeline(item, {
          title: "Seller Confirmed",
          status: "Seller Confirmed",
          actor,
          description: "Seller accepted the purchase order (simulated).",
          timestamp,
        }),
      });
    }
    if (outcome === "rejected") {
      return stamp(item, "Rejected", {
        timeline: appendTimeline(item, {
          title: "Seller Rejected",
          status: "Rejected",
          actor,
          description: "Seller rejected the purchase order (simulated).",
          timestamp,
        }),
      });
    }
    return stamp(item, "Negotiation", {
      negotiation: {
        initialPrice: item.negotiatedPrice ?? Math.round(item.estimatedCost / Math.max(item.quantity, 1)),
        latestPrice: item.negotiatedPrice ?? Math.round(item.estimatedCost / Math.max(item.quantity, 1)),
        adminTargetPrice: Math.round((item.negotiatedPrice ?? 0) * 0.97),
        quantity: item.quantity,
        status: "Open",
        remarks: "Seller requested revision.",
      },
      timeline: appendTimeline(item, {
        title: "Revision Requested",
        status: "Negotiation",
        actor,
        description: "Seller requested a price/terms revision (simulated).",
        timestamp,
      }),
    });
  },

  createDispatch(item: Procurement, input: CreateDispatchInput, actor: string) {
    const timestamp = nowIso();
    const shipmentId = `SHP-${4400 + Math.floor(Math.random() * 80)}`;
    const dispatch: ProcurementDispatchInfo = { ...input };
    return stamp(item, "Dispatched", {
      dispatch,
      shipment: {
        shipmentId,
        vehicle: input.vehicle,
        route: `${input.loadingLocation} → ${input.destination}`,
        dispatchDate: input.dispatchDate,
        eta: input.expectedArrival,
        status: "Dispatched",
      },
      timeline: appendTimeline(item, {
        title: "Dispatch Created",
        status: "Dispatched",
        actor,
        description: `Vehicle ${input.vehicle} assigned. Handoff to Logistics.`,
        timestamp,
      }),
    });
  },

  updateShipment(
    item: Procurement,
    status: NonNullable<Procurement["shipment"]>["status"],
    actor: string,
  ) {
    if (!item.shipment) return item;
    const timestamp = nowIso();
    const nextStatus: ProcurementStatus = status === "Delivered" ? "Completed" : "Dispatched";
    return stamp(item, nextStatus, {
      shipment: { ...item.shipment, status },
      timeline: appendTimeline(item, {
        title: status === "Delivered" ? "Completed" : `Shipment ${status}`,
        status: nextStatus,
        actor,
        description: `Shipment ${item.shipment.shipmentId} marked ${status}.`,
        timestamp,
      }),
    });
  },

  moveToStatus(item: Procurement, status: ProcurementStatus, actor: string) {
    const timestamp = nowIso();
    const extra: Partial<Procurement> = {};
    if (status === "PO Created" && !item.poNumber) extra.poNumber = item.id;
    return stamp(item, status, {
      ...extra,
      timeline: appendTimeline(item, {
        title: `Moved to ${status}`,
        status,
        actor,
        description: `Queue card moved to ${status}.`,
        timestamp,
      }),
    });
  },
};
