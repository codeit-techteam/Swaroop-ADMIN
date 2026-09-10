import { formatInrExact } from "@/lib/format";
import type {
  Procurement,
  ProcurementActivity,
  ProcurementStatus,
  ProcurementTimelineEvent,
} from "@/types";

export const GST_RATE = 0.18;

export const PROCUREMENT_STATUSES: ProcurementStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "Negotiation",
  "Urgent Review",
  "Pending Inv.",
  "Pending Approval",
  "Approved",
  "Rejected",
  "PO Created",
  "Seller Confirmed",
  "Processing",
  "Dispatched",
  "Completed",
  "Cancelled",
];

export const PROCESS_STAGES = [
  { key: "request", label: "Request" },
  { key: "supplier", label: "Supplier" },
  { key: "negotiation", label: "Negotiation" },
  { key: "approval", label: "Approval" },
  { key: "po", label: "PO" },
  { key: "seller", label: "Seller Confirmation" },
  { key: "dispatch", label: "Dispatch" },
  { key: "shipment", label: "Shipment" },
  { key: "completed", label: "Completed" },
] as const;

export type ProcessStageKey = (typeof PROCESS_STAGES)[number]["key"];

export const QUEUE_COLUMNS = [
  { key: "new", label: "New", statuses: ["Draft", "Submitted"] as ProcurementStatus[] },
  { key: "review", label: "Under Review", statuses: ["Under Review", "Urgent Review", "Pending Inv."] as ProcurementStatus[] },
  { key: "negotiation", label: "Negotiation", statuses: ["Negotiation"] as ProcurementStatus[] },
  { key: "approval", label: "Pending Approval", statuses: ["Pending Approval"] as ProcurementStatus[] },
  { key: "approved", label: "Approved", statuses: ["Approved"] as ProcurementStatus[] },
  { key: "po", label: "PO Created", statuses: ["PO Created"] as ProcurementStatus[] },
  { key: "seller", label: "Seller Confirmed", statuses: ["Seller Confirmed", "Processing"] as ProcurementStatus[] },
  { key: "dispatch", label: "Dispatch", statuses: ["Dispatched"] as ProcurementStatus[] },
  { key: "completed", label: "Completed", statuses: ["Completed"] as ProcurementStatus[] },
] as const;

export type QueueColumnKey = (typeof QUEUE_COLUMNS)[number]["key"];

export const QUEUE_COLUMN_STATUS: Record<QueueColumnKey, ProcurementStatus> = {
  new: "Submitted",
  review: "Under Review",
  negotiation: "Negotiation",
  approval: "Pending Approval",
  approved: "Approved",
  po: "PO Created",
  seller: "Seller Confirmed",
  dispatch: "Dispatched",
  completed: "Completed",
};

export const PENDING_APPROVAL_STATUSES: ProcurementStatus[] = ["Pending Approval", "Urgent Review"];
export const OPEN_PO_STATUSES: ProcurementStatus[] = ["PO Created", "Seller Confirmed", "Processing", "Dispatched"];
export const APPROVABLE_STATUSES: ProcurementStatus[] = [
  "Submitted",
  "Under Review",
  "Negotiation",
  "Urgent Review",
  "Pending Inv.",
  "Pending Approval",
];

export type QuickFilter =
  | "all"
  | "needs-action"
  | "Negotiation"
  | "Urgent Review"
  | "Pending Inv."
  | "Approved";
export type KpiFilter = "pending-approvals" | "avg-time" | "negotiations" | "open-po" | null;

export const ATTENTION_STATUSES: ProcurementStatus[] = [
  "Urgent Review",
  "Pending Approval",
  "Pending Inv.",
  "Under Review",
];

export function needsAttention(status: ProcurementStatus) {
  return ATTENTION_STATUSES.includes(status);
}

export function rowAccent(status: ProcurementStatus) {
  if (status === "Urgent Review") return "urgent";
  if (status === "Approved") return "ready";
  if (ATTENTION_STATUSES.includes(status) || status === "Negotiation") return "wait";
  return "neutral";
}

export interface AdvancedFilters {
  status: ProcurementStatus | "";
  commodity: string;
  supplier: string;
  customer: string;
  seller: string;
  location: string;
  dateFrom: string;
  dateTo: string;
  valueMin: string;
  valueMax: string;
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  status: "",
  commodity: "",
  supplier: "",
  customer: "",
  seller: "",
  location: "",
  dateFrom: "",
  dateTo: "",
  valueMin: "",
  valueMax: "",
};

export function withAliases(
  item: Omit<Procurement, "supplier" | "estCost" | "buyer"> &
    Partial<Pick<Procurement, "supplier" | "estCost" | "buyer">>,
): Procurement {
  return {
    ...item,
    supplier: item.sellerName ?? item.supplier ?? "Unassigned",
    estCost: item.estimatedCost,
    buyer: item.customerName,
  };
}

export function appendTimeline(
  item: Procurement,
  event: Omit<ProcurementTimelineEvent, "id">,
): ProcurementTimelineEvent[] {
  return [
    ...item.timeline,
    { ...event, id: `TL-${item.id}-${item.timeline.length + 1}-${Date.now()}` },
  ];
}

export function stageIndexForStatus(status: ProcurementStatus): number {
  switch (status) {
    case "Draft":
    case "Submitted":
      return 0;
    case "Under Review":
    case "Urgent Review":
    case "Pending Inv.":
      return 1;
    case "Negotiation":
      return 2;
    case "Pending Approval":
    case "Approved":
    case "Rejected":
      return 3;
    case "PO Created":
      return 4;
    case "Seller Confirmed":
    case "Processing":
      return 5;
    case "Dispatched":
      return 6;
    case "Completed":
      return 8;
    case "Cancelled":
      return 0;
    default:
      return 0;
  }
}

export function stageState(status: ProcurementStatus, index: number): "complete" | "current" | "upcoming" {
  if (status === "Dispatched") {
    if (index < 6) return "complete";
    if (index === 6 || index === 7) return "current";
    return "upcoming";
  }
  const current = stageIndexForStatus(status);
  if (status === "Completed") {
    return index <= 8 ? "complete" : "upcoming";
  }
  if (index < current) return "complete";
  if (index === current) return "current";
  return "upcoming";
}

export function queueColumnForStatus(status: ProcurementStatus): QueueColumnKey | null {
  const column = QUEUE_COLUMNS.find((item) => item.statuses.includes(status));
  return column?.key ?? null;
}

export function daysBetween(from: string, to: string) {
  return Math.abs(new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
}

export interface ProcurementKpis {
  pendingApprovals: number;
  avgProcDays: number;
  activeNegotiations: number;
  openPoValue: number;
}

export function computeKpis(rows: Procurement[], now = new Date()): ProcurementKpis {
  const pendingApprovals = rows.filter((row) => PENDING_APPROVAL_STATUSES.includes(row.status)).length;
  const activeNegotiations = rows.filter((row) => row.status === "Negotiation").length;
  const openPoValue = rows
    .filter((row) => OPEN_PO_STATUSES.includes(row.status))
    .reduce((sum, row) => sum + row.estimatedCost, 0);

  const samples = rows.map((row) => {
    const end =
      row.status === "Completed" || row.status === "Cancelled" || row.status === "Rejected"
        ? row.updatedAt
        : now.toISOString();
    return daysBetween(row.createdAt, end);
  });
  const avgProcDays = samples.length === 0 ? 0 : samples.reduce((sum, days) => sum + days, 0) / samples.length;

  return { pendingApprovals, avgProcDays, activeNegotiations, openPoValue };
}

export function formatKpiDays(value: number) {
  return `${value.toFixed(1)}d`;
}

export function formatOpenPoValue(value: number) {
  if (value >= 100_000) {
    const lakhs = value / 100_000;
    return `₹${lakhs >= 10 ? lakhs.toFixed(1) : lakhs.toFixed(1)}L`;
  }
  return formatInrExact(value);
}

export function matchesSearch(row: Procurement, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    row.id,
    row.poNumber,
    row.commodity,
    row.grade,
    row.supplier,
    row.sellerName,
    row.customerName,
    row.buyer,
    row.status,
    row.deliveryLocation,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export function advancedFilterCount(filters: AdvancedFilters) {
  return Object.values(filters).filter((value) => value !== "").length;
}

export function applyFilters(
  rows: Procurement[],
  opts: {
    search: string;
    quick: QuickFilter;
    kpi: KpiFilter;
    advanced: AdvancedFilters;
  },
) {
  return rows.filter((row) => {
    if (!matchesSearch(row, opts.search)) return false;

    if (opts.kpi === "pending-approvals" && !PENDING_APPROVAL_STATUSES.includes(row.status)) return false;
    if (opts.kpi === "negotiations" && row.status !== "Negotiation") return false;
    if (opts.kpi === "open-po" && !OPEN_PO_STATUSES.includes(row.status)) return false;
    if (
      opts.kpi === "avg-time" &&
      (row.status === "Completed" || row.status === "Cancelled" || row.status === "Rejected")
    ) {
      return false;
    }

    if (opts.quick === "needs-action" && !needsAttention(row.status)) return false;
    else if (opts.quick !== "all" && opts.quick !== "needs-action" && row.status !== opts.quick) return false;

    const adv = opts.advanced;
    if (adv.status && row.status !== adv.status) return false;
    if (adv.commodity && row.commodity !== adv.commodity) return false;
    if (adv.supplier && row.supplier !== adv.supplier && row.sellerName !== adv.supplier) return false;
    if (adv.customer && row.customerName !== adv.customer) return false;
    if (adv.seller && row.sellerName !== adv.seller) return false;
    if (adv.location && !row.deliveryLocation.toLowerCase().includes(adv.location.toLowerCase())) return false;
    if (adv.dateFrom && row.createdAt.slice(0, 10) < adv.dateFrom) return false;
    if (adv.dateTo && row.createdAt.slice(0, 10) > adv.dateTo) return false;
    const min = adv.valueMin ? Number(adv.valueMin) : NaN;
    const max = adv.valueMax ? Number(adv.valueMax) : NaN;
    if (Number.isFinite(min) && row.estimatedCost < min) return false;
    if (Number.isFinite(max) && row.estimatedCost > max) return false;
    return true;
  });
}

export function toExportRow(row: Procurement) {
  return {
    poId: row.poNumber ?? row.id,
    commodity: row.commodity,
    supplier: row.supplier,
    customer: row.customerName,
    quantity: `${row.quantity} ${row.unit}`,
    estimatedCost: row.estimatedCost,
    status: row.status,
    createdDate: row.createdAt,
    updatedDate: row.updatedAt,
  };
}

export function gstBreakdown(subtotal: number, rate = GST_RATE) {
  const gst = Math.round(subtotal * rate);
  return { subtotal, gst, total: subtotal + gst };
}

export function expectedSavings(negotiation: NonNullable<Procurement["negotiation"]>) {
  return (negotiation.initialPrice - negotiation.latestPrice) * negotiation.quantity;
}

export function nextProcurementId(existing: Procurement[]) {
  const nums = existing
    .map((item) => Number.parseInt(item.id.replace(/\D/g, "").slice(0, 4), 10))
    .filter((value) => Number.isFinite(value));
  const next = (Math.max(8829, ...nums) + 1).toString();
  return `PO-${next}-N`;
}

export function makeActivity(actor: string, action: string, referenceId: string): ProcurementActivity {
  return {
    id: `ACT-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    actor,
    action,
    timestamp: new Date().toISOString(),
    referenceId,
  };
}

export function nextActionLabel(status: ProcurementStatus) {
  if (APPROVABLE_STATUSES.includes(status)) return "Approve";
  if (status === "Approved") return "Create PO";
  if (status === "PO Created") return "Confirm";
  if (status === "Seller Confirmed" || status === "Processing") return "Dispatch";
  if (status === "Dispatched") return "Track";
  return null;
}
