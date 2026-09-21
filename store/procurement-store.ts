"use client";

import { create } from "zustand";

import {
  applyFilters,
  EMPTY_ADVANCED_FILTERS,
  makeActivity,
  QUEUE_COLUMN_STATUS,
  type AdvancedFilters,
  type KpiFilter,
  type QueueColumnKey,
  type QuickFilter,
} from "@/lib/procurement";
import {
  procurementService,
  type CounterOfferInput,
  type CreateDispatchInput,
  type CreatePoInput,
  type CreateProcurementInput,
} from "@/lib/services/procurement-service";
import { useAuthStore } from "@/store/auth-store";
import { useDataStore } from "@/store/data-store";
import type { Procurement, ProcurementActivity, ProcurementStatus } from "@/types";

export type WorkbenchView = "table" | "queue";

interface ProcurementState {
  procurements: Procurement[];
  selectedId: string | null;
  filters: {
    search: string;
    quick: QuickFilter;
    kpi: KpiFilter;
    advanced: AdvancedFilters;
  };
  viewMode: WorkbenchView;
  activities: ProcurementActivity[];
  loading: boolean;
  loadError: string | null;
  modal:
    | { type: "none" }
    | { type: "approve"; id: string }
    | { type: "reject"; id: string }
    | { type: "send-back"; id: string }
    | { type: "counter"; id: string }
    | { type: "create-po"; id: string }
    | { type: "dispatch"; id: string }
    | { type: "new-procurement" };

  selectedProcurement: () => Procurement | null;
  filteredProcurements: () => Procurement[];

  setSearchQuery: (search: string) => void;
  setQuickFilter: (quick: QuickFilter) => void;
  setKpiFilter: (kpi: KpiFilter) => void;
  setAdvancedFilters: (advanced: AdvancedFilters) => void;
  clearFilters: () => void;
  setViewMode: (viewMode: WorkbenchView) => void;
  selectProcurement: (id: string | null) => void;
  openModal: (modal: ProcurementState["modal"]) => void;
  closeModal: () => void;
  hydrate: () => Promise<void>;

  createProcurement: (input: CreateProcurementInput, mode: "draft" | "submit") => Procurement;
  updateProcurement: (id: string, patch: Partial<Procurement>) => void;
  approveProcurement: (id: string) => void;
  rejectProcurement: (id: string, reason: string) => void;
  sendBackProcurement: (id: string, comments: string) => void;
  startNegotiation: (id: string) => void;
  submitCounterOffer: (id: string, input: CounterOfferInput) => void;
  acceptNegotiation: (id: string) => void;
  rejectNegotiation: (id: string) => void;
  selectPreferredSupplier: (id: string, quotationId: string) => void;
  createPurchaseOrder: (id: string, input: CreatePoInput) => void;
  confirmSeller: (id: string, outcome: "accepted" | "rejected" | "revision") => void;
  createDispatch: (id: string, input: CreateDispatchInput) => void;
  updateShipment: (id: string, status: NonNullable<Procurement["shipment"]>["status"]) => void;
  moveToQueueColumn: (id: string, column: QueueColumnKey) => void;
}

function actorName() {
  return useAuthStore.getState().user?.name ?? "Admin";
}

function notify(title: string, body: string, href: string) {
  useDataStore.getState().pushNotification({
    type: "Procurement",
    title,
    body,
    href,
    source: "Admin Portal",
  });
}

function audit(action: string, entity: string) {
  const user = useAuthStore.getState().user;
  useDataStore.getState().pushAudit({
    admin: user?.name ?? "Admin",
    role: user?.role ?? "ADMIN",
    action,
    module: "Procurement",
    entity,
    result: "Success",
  });
}

function replace(list: Procurement[], next: Procurement) {
  return list.map((item) => (item.id === next.id ? next : item));
}

export const useProcurementStore = create<ProcurementState>((set, get) => ({
  procurements: [],
  selectedId: null,
  filters: {
    search: "",
    quick: "all",
    kpi: null,
    advanced: EMPTY_ADVANCED_FILTERS,
  },
  viewMode: "table",
  activities: [],
  loading: false,
  loadError: null,
  modal: { type: "none" },

  selectedProcurement: () => {
    const { procurements, selectedId } = get();
    return procurements.find((item) => item.id === selectedId) ?? null;
  },

  filteredProcurements: () => {
    const { procurements, filters } = get();
    return applyFilters(procurements, {
      search: filters.search,
      quick: filters.quick,
      kpi: filters.kpi,
      advanced: filters.advanced,
    });
  },

  setSearchQuery: (search) =>
    set((state) => ({ filters: { ...state.filters, search } })),

  setQuickFilter: (quick) =>
    set((state) => ({ filters: { ...state.filters, quick, kpi: null } })),

  setKpiFilter: (kpi) =>
    set((state) => ({
      filters: {
        ...state.filters,
        kpi: state.filters.kpi === kpi ? null : kpi,
        quick: "all",
      },
    })),

  setAdvancedFilters: (advanced) =>
    set((state) => ({ filters: { ...state.filters, advanced } })),

  clearFilters: () =>
    set({
      filters: {
        search: "",
        quick: "all",
        kpi: null,
        advanced: EMPTY_ADVANCED_FILTERS,
      },
    }),

  setViewMode: (viewMode) => set({ viewMode }),

  selectProcurement: (id) => set({ selectedId: id }),

  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: { type: "none" } }),
  hydrate: async () => {
    set({ loading: true, loadError: null });
    try {
      const procurements = await procurementService.getProcurements();
      set({ procurements, loading: false, loadError: null });
    } catch (error) {
      set({
        procurements: [],
        loading: false,
        loadError: error instanceof Error ? error.message : "Unable to load purchase requests.",
      });
    }
  },

  createProcurement: (input, mode) => {
    const actor = actorName();
    const item = procurementService.createProcurement(get().procurements, input, mode, actor);
    const action =
      mode === "draft"
        ? `Draft saved for ${item.commodity}`
        : `New procurement request received ${item.id}`;
    set((state) => ({
      procurements: [item, ...state.procurements],
      activities: [makeActivity(actor, action, item.id), ...state.activities],
      selectedId: item.id,
    }));
    notify(
      mode === "draft" ? "Procurement draft saved" : "New procurement request received",
      `${item.id} · ${item.commodity} · ${item.customerName}`,
      `/procurement?id=${item.id}`,
    );
    audit(action, item.id);
    return item;
  },

  updateProcurement: (id, patch) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const next = procurementService.updateProcurement(current, patch);
    set((state) => ({ procurements: replace(state.procurements, next) }));
  },

  approveProcurement: (id) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.approveProcurement(current, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Admin approved ${id}`, id), ...state.activities],
      modal: { type: "none" },
    }));
    notify("Approval required resolved", `${id} approved`, `/procurement?id=${id}`);
    audit(`Approved procurement ${id}`, id);
  },

  rejectProcurement: (id, reason) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.rejectProcurement(current, actor, reason);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Rejected ${id}`, id), ...state.activities],
      modal: { type: "none" },
    }));
    audit(`Rejected procurement ${id}`, id);
  },

  sendBackProcurement: (id, comments) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.sendBackProcurement(current, actor, comments);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Sent back ${id}`, id), ...state.activities],
      modal: { type: "none" },
    }));
    audit(`Sent back procurement ${id}`, id);
  },

  startNegotiation: (id) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.startNegotiation(current, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Procurement ${id} moved to Negotiation`, id), ...state.activities],
    }));
  },

  submitCounterOffer: (id, input) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.submitCounterOffer(current, input, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [
        makeActivity(actor, `Counter offer submitted for ${current.commodity}`, id),
        ...state.activities,
      ],
      modal: { type: "none" },
    }));
    notify("Supplier counter offer received", `Counter on ${current.commodity} for ${id}`, `/procurement?id=${id}`);
    audit(`Counter offer on ${id}`, id);
  },

  acceptNegotiation: (id) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.acceptNegotiation(current, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Accepted negotiated price for ${id}`, id), ...state.activities],
    }));
  },

  rejectNegotiation: (id) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.rejectNegotiation(current, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Rejected negotiation for ${id}`, id), ...state.activities],
    }));
  },

  selectPreferredSupplier: (id, quotationId) => {
    const current = get().procurements.find((item) => item.id === id);
    const quote = current?.quotations.find((item) => item.id === quotationId);
    if (!current || !quote) return;
    const actor = actorName();
    const next = procurementService.selectPreferredSupplier(current, quote, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Preferred supplier ${quote.supplier} for ${id}`, id), ...state.activities],
    }));
  },

  createPurchaseOrder: (id, input) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.createPO(current, input, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `PO created for ${input.sellerName}`, id), ...state.activities],
      modal: { type: "none" },
    }));
    notify("PO created", `${next.poNumber ?? id} issued to ${input.sellerName}`, `/procurement?id=${id}`);
    audit(`Created PO ${next.poNumber ?? id}`, id);
  },

  confirmSeller: (id, outcome) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.confirmSeller(current, outcome, actor);
    const label =
      outcome === "accepted"
        ? "Seller confirmation received"
        : outcome === "rejected"
          ? "Seller rejected PO"
          : "Seller requested revision";
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `${label} for ${id}`, id), ...state.activities],
    }));
    notify(label, `${id} · ${current.sellerName ?? current.supplier}`, `/procurement?id=${id}`);
  },

  createDispatch: (id, input) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.createDispatch(current, input, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Dispatch created for ${id}`, id), ...state.activities],
      modal: { type: "none" },
    }));
    if (next.shipment) {
      useDataStore.getState().addShipment({
        id: next.shipment.shipmentId,
        orderId: next.poNumber ?? next.id,
        seller: next.sellerName ?? next.supplier,
        customer: next.customerName,
        grade: next.grade,
        quantity: next.quantity,
        vehicle: next.shipment.vehicle,
        route: next.shipment.route,
        eta: next.shipment.eta,
        status: "Dispatched",
        milestone: "Gate out",
        source: "Admin Portal",
      });
    }
    notify("Dispatch created", `${id} handed to Logistics`, `/logistics?id=${next.shipment?.shipmentId ?? ""}`);
    audit(`Created dispatch for ${id}`, id);
  },

  updateShipment: (id, status) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const actor = actorName();
    const next = procurementService.updateShipment(current, status, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Shipment ${status} for ${id}`, id), ...state.activities],
    }));
    if (next.shipment) {
      const shipmentStatus = status === "Delivered" ? "Delivered" : status === "In Transit" ? "In Transit" : "Dispatched";
      useDataStore.getState().updateShipment(next.shipment.shipmentId, { status: shipmentStatus });
    }
  },

  moveToQueueColumn: (id, column) => {
    const current = get().procurements.find((item) => item.id === id);
    if (!current) return;
    const status: ProcurementStatus = QUEUE_COLUMN_STATUS[column];
    if (current.status === status) return;
    const actor = actorName();
    const next = procurementService.moveToStatus(current, status, actor);
    set((state) => ({
      procurements: replace(state.procurements, next),
      activities: [makeActivity(actor, `Procurement ${id} moved to ${status}`, id), ...state.activities],
    }));
  },
}));
