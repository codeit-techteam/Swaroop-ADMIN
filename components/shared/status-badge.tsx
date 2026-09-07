import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Seller Confirmed": "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Collected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Operational: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-800 border-amber-200",
  "Under Review": "bg-amber-50 text-amber-800 border-amber-200",
  Processing: "bg-amber-50 text-amber-800 border-amber-200",
  Negotiation: "bg-amber-50 text-amber-800 border-amber-200",
  "Pending Inv.": "bg-amber-50 text-amber-800 border-amber-200",
  "Pending Approval": "bg-amber-50 text-amber-800 border-amber-200",
  "Pending Review": "bg-amber-50 text-amber-800 border-amber-200",
  Due: "bg-amber-50 text-amber-800 border-amber-200",
  Draft: "bg-slate-50 text-slate-600 border-slate-200",
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200",
  Submitted: "bg-slate-50 text-slate-700 border-slate-200",
  Inactive: "bg-slate-50 text-slate-600 border-slate-200",
  Scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  SCHEDULED: "bg-sky-50 text-sky-700 border-sky-200",
  Paused: "bg-amber-50 text-amber-800 border-amber-200",
  PAUSED: "bg-amber-50 text-amber-800 border-amber-200",
  Expired: "bg-slate-50 text-slate-600 border-slate-200",
  EXPIRED: "bg-slate-50 text-slate-600 border-slate-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Current: "bg-slate-50 text-slate-600 border-slate-200",
  Open: "bg-sky-50 text-sky-700 border-sky-200",
  Investigating: "bg-sky-50 text-sky-700 border-sky-200",
  "In Transit": "bg-sky-50 text-sky-700 border-sky-200",
  "PO Created": "bg-sky-50 text-sky-700 border-sky-200",
  Dispatched: "bg-sky-50 text-sky-700 border-sky-200",
  Loading: "bg-sky-50 text-sky-700 border-sky-200",
  Sourcing: "bg-sky-50 text-sky-700 border-sky-200",
  Matched: "bg-sky-50 text-sky-700 border-sky-200",
  Negotiating: "bg-sky-50 text-sky-700 border-sky-200",
  "Urgent Review": "bg-red-50 text-red-700 border-red-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
  Suspended: "bg-red-50 text-red-700 border-red-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
  Delayed: "bg-red-50 text-red-700 border-red-200",
  Disputed: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  Critical: "bg-red-50 text-red-700 border-red-200",
  High: "bg-red-50 text-red-700 border-red-200",
  Medium: "bg-amber-50 text-amber-800 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Refunded: "bg-slate-50 text-slate-600 border-slate-200",
  Closed: "bg-slate-50 text-slate-600 border-slate-200",
  "Ready for Dispatch": "bg-sky-50 text-sky-700 border-sky-200",
  Quoted: "bg-sky-50 text-sky-700 border-sky-200",
  Selected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Countered: "bg-amber-50 text-amber-800 border-amber-200",
  Accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Awaiting Info": "bg-amber-50 text-amber-800 border-amber-200",
  "Revision Requested": "bg-amber-50 text-amber-800 border-amber-200",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium",
        TONE[value] ?? "bg-slate-50 text-slate-600 border-slate-200",
        className,
      )}
    >
      {value}
    </span>
  );
}
