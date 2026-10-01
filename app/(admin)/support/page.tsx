"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import {
  listAdminSupportTickets,
  replyAdminSupportTicket,
  updateAdminSupportTicketStatus,
} from "@/lib/api/ops";
import { cn } from "@/lib/utils";
import type { SupportTicket, SupportTicketStatusCode } from "@/types";

const REFRESH_INTERVAL_MS = 60_000;
const RESOLUTION_NOTE_MIN_LENGTH = 5;

type StatusAction = {
  ticket: SupportTicket;
  to: SupportTicketStatusCode;
};

function actionLabel(from: SupportTicketStatusCode, to: SupportTicketStatusCode) {
  if (to === "IN_PROGRESS") {
    return from === "RESOLVED" || from === "CLOSED" ? "Reopen" : "Mark In Progress";
  }
  if (to === "WAITING_CUSTOMER") return "Waiting on Requester";
  if (to === "RESOLVED") return "Resolve";
  if (to === "CLOSED") return "Close";
  return "Reopen";
}

const SENDER_STYLES: Record<SupportTicket["messages"][number]["sender"], string> = {
  REQUESTER: "border-slate-200 bg-white",
  AGENT: "border-sky-200 bg-sky-50",
  SYSTEM: "border-dashed border-slate-200 bg-slate-50 text-muted-foreground",
};

export default function SupportTicketsPage() {
  const [rows, setRows] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const busy = useRef(false);
  busy.current = Boolean(sendingReplyId) || savingStatus;

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    else setRefreshing(true);
    try {
      setRows(await listAdminSupportTickets());
      setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load support tickets.";
      if (mode === "initial") {
        setLoadError(message);
        setRows([]);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load("initial");
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !busy.current) void load("refresh");
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const replaceRow = (updated: SupportTicket) =>
    setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));

  const kpis = useMemo(() => {
    const count = (predicate: (r: SupportTicket) => boolean) => String(rows.filter(predicate).length);
    return [
      { label: "Needs reply", value: count((r) => r.awaitingSupport), tone: "danger" as const },
      { label: "Open", value: count((r) => r.statusCode === "OPEN"), tone: "warning" as const },
      { label: "Waiting on requester", value: count((r) => r.statusCode === "WAITING_CUSTOMER") },
      { label: "Resolved", value: count((r) => r.statusCode === "RESOLVED"), tone: "success" as const },
    ];
  }, [rows]);

  const sendReply = async (ticket: SupportTicket) => {
    const body = replyDrafts[ticket.id]?.trim();
    if (!body) return;
    setSendingReplyId(ticket.id);
    try {
      replaceRow(await replyAdminSupportTicket(ticket.id, body));
      setReplyDrafts((current) => ({ ...current, [ticket.id]: "" }));
      toast.success("Reply sent to requester");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reply failed");
    } finally {
      setSendingReplyId(null);
    }
  };

  const openStatusAction = (ticket: SupportTicket, to: SupportTicketStatusCode) => {
    setStatusNote("");
    setStatusAction({ ticket, to });
  };

  const noteRequired = statusAction?.to === "RESOLVED";
  const noteValid = !noteRequired || statusNote.trim().length >= RESOLUTION_NOTE_MIN_LENGTH;

  const saveStatus = async () => {
    if (!statusAction || !noteValid) return;
    setSavingStatus(true);
    try {
      replaceRow(await updateAdminSupportTicketStatus(statusAction.ticket.id, statusAction.to, statusNote));
      toast.success(`Ticket ${statusAction.ticket.ticketNumber} updated`);
      setStatusAction(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      void load("refresh");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <>
      <EntityWorkbench
        title="Support Tickets"
        description="Tickets raised from Customer Web, Customer App, Seller Web, and Seller App."
        kpis={kpis}
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load("initial")}
        actions={
          <Button size="sm" variant="outline" disabled={refreshing} onClick={() => void load("refresh")}>
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        }
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          {
            key: "ticket",
            header: "Ticket ID",
            sortable: true,
            accessor: (r) => r.ticketNumber,
            render: (r) => (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{r.ticketNumber}</span>
                {r.awaitingSupport ? (
                  <span className="w-fit rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                    Needs reply
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: "org",
            header: "Organization",
            sortable: true,
            accessor: (r) => r.organizationName,
          },
          {
            key: "requester",
            header: "Requester",
            accessor: (r) => `${r.requesterName} (${r.requesterType})`,
          },
          { key: "category", header: "Category", accessor: (r) => r.category },
          { key: "subject", header: "Subject", accessor: (r) => r.subject },
          {
            key: "priority",
            header: "Priority",
            render: (r) => <StatusBadge value={r.priority} />,
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge value={r.status} />,
          },
          {
            key: "source",
            header: "Source",
            render: (r) => <SourceBadge source={r.source} />,
          },
          {
            key: "updated",
            header: "Last update",
            sortable: true,
            accessor: (r) => r.updatedAt,
            render: (r) => formatRelativeTime(r.updatedAt),
          },
        ]}
        searchPlaceholder="Search tickets"
        searchFn={(r, q) =>
          `${r.ticketNumber} ${r.organizationName} ${r.requesterName} ${r.subject} ${r.category} ${r.relatedOrderId ?? ""}`
            .toLowerCase()
            .includes(q)
        }
        filters={[
          { label: "Needs reply", value: "needs-reply", predicate: (r) => r.awaitingSupport },
          { label: "Open", value: "Open", predicate: (r) => r.statusCode === "OPEN" },
          { label: "In Progress", value: "In Progress", predicate: (r) => r.statusCode === "IN_PROGRESS" },
          { label: "Waiting", value: "Waiting", predicate: (r) => r.statusCode === "WAITING_CUSTOMER" },
          { label: "Resolved", value: "Resolved", predicate: (r) => r.statusCode === "RESOLVED" },
          { label: "Closed", value: "Closed", predicate: (r) => r.statusCode === "CLOSED" },
          { label: "Customer", value: "Customer", predicate: (r) => r.requesterType === "Customer" },
          { label: "Seller", value: "Seller", predicate: (r) => r.requesterType === "Seller" },
          { label: "App", value: "App", predicate: (r) => r.source.endsWith("App") },
          { label: "Web", value: "Web", predicate: (r) => r.source.endsWith("Web") },
        ]}
        emptyTitle="No support tickets found."
        emptyDescription="Tickets raised by customers and sellers will appear here."
        exportName="support-tickets"
        exportRow={(r) => ({
          id: r.ticketNumber,
          org: r.organizationName,
          requester: r.requesterName,
          requesterType: r.requesterType,
          category: r.category,
          subject: r.subject,
          priority: r.priority,
          status: r.status,
          source: r.source,
          assignedTo: r.assignedTo,
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
          resolutionNote: r.resolutionNote,
        })}
        drawerTitle={(r) => r.ticketNumber}
        drawerDescription={(r) => r.subject}
        renderDetails={(r) => {
          const draft = replyDrafts[r.id] ?? "";
          const closed = r.statusCode === "CLOSED";
          return (
            <div className="space-y-4">
              <dl>
                <DetailRow label="Organization" value={r.organizationName} />
                <DetailRow label="Requester" value={`${r.requesterName} (${r.requesterType})`} />
                {r.requesterEmail ? <DetailRow label="Email" value={r.requesterEmail} /> : null}
                {r.requesterPhone ? <DetailRow label="Phone" value={r.requesterPhone} /> : null}
                <DetailRow label="Category" value={r.category} />
                <DetailRow label="Priority" value={<StatusBadge value={r.priority} />} />
                <DetailRow label="Status" value={<StatusBadge value={r.status} />} />
                {r.relatedOrderId ? <DetailRow label="Related order" value={r.relatedOrderId} /> : null}
                {r.attachmentName ? <DetailRow label="Attachment" value={r.attachmentName} /> : null}
                <DetailRow label="Assigned" value={r.assignedTo} />
                <DetailRow label="Created" value={formatDateTime(r.createdAt)} />
                {r.resolvedAt ? <DetailRow label="Resolved" value={formatDateTime(r.resolvedAt)} /> : null}
                {r.closedAt ? <DetailRow label="Closed" value={formatDateTime(r.closedAt)} /> : null}
                <DetailRow label="Source" value={<SourceBadge source={r.source} />} />
              </dl>

              {r.resolutionNote && (r.statusCode === "RESOLVED" || r.statusCode === "CLOSED") ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    Resolution
                  </p>
                  <p className="whitespace-pre-wrap text-emerald-900">{r.resolutionNote}</p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Conversation
                </p>
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {r.messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages yet.</p>
                  ) : (
                    r.messages.map((m) => (
                      <div key={m.id} className={cn("rounded-md border p-2.5 text-sm", SENDER_STYLES[m.sender])}>
                        <p className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-foreground">
                            {m.sender === "AGENT" ? `${m.senderName} · Support` : m.senderName}
                          </span>
                          <span className="text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                        {m.attachmentName ? (
                          <p className="mt-1 text-xs text-muted-foreground">Attachment: {m.attachmentName}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder={closed ? "Reopen this ticket to reply." : "Reply to requester…"}
                  value={draft}
                  disabled={closed}
                  maxLength={5000}
                  onChange={(e) => setReplyDrafts((current) => ({ ...current, [r.id]: e.target.value }))}
                  rows={3}
                />
                <Button
                  size="sm"
                  disabled={closed || !draft.trim() || sendingReplyId === r.id}
                  onClick={() => void sendReply(r)}
                >
                  {sendingReplyId === r.id ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </div>
          );
        }}
        drawerFooter={(r) =>
          r.allowedTransitions.length === 0 ? null : (
            <div className="grid grid-cols-2 gap-2">
              {r.allowedTransitions.map((to) => (
                <Button
                  key={to}
                  size="sm"
                  variant={to === "RESOLVED" ? "default" : to === "CLOSED" ? "destructive" : "outline"}
                  onClick={() => openStatusAction(r, to)}
                >
                  {actionLabel(r.statusCode, to)}
                </Button>
              ))}
            </div>
          )
        }
      />

      <Dialog open={Boolean(statusAction)} onOpenChange={(open) => !open && !savingStatus && setStatusAction(null)}>
        <DialogContent>
          {statusAction ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {actionLabel(statusAction.ticket.statusCode, statusAction.to)} {statusAction.ticket.ticketNumber}
                </DialogTitle>
                <DialogDescription>
                  {statusAction.to === "RESOLVED"
                    ? "The requester is notified and sees this resolution note in their app."
                    : "The requester is notified of this change. A message is optional."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="support-status-note">
                  {noteRequired ? "Resolution note" : "Message to requester (optional)"}
                </Label>
                <Textarea
                  id="support-status-note"
                  rows={4}
                  maxLength={2000}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder={
                    noteRequired
                      ? "Explain what was done to resolve this issue…"
                      : "Add context for the requester…"
                  }
                />
                {noteRequired && !noteValid ? (
                  <p className="text-xs text-muted-foreground">
                    At least {RESOLUTION_NOTE_MIN_LENGTH} characters.
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={savingStatus} onClick={() => setStatusAction(null)}>
                  Cancel
                </Button>
                <Button
                  variant={statusAction.to === "CLOSED" ? "destructive" : "default"}
                  disabled={!noteValid || savingStatus}
                  onClick={() => void saveStatus()}
                >
                  {savingStatus ? "Saving…" : actionLabel(statusAction.ticket.statusCode, statusAction.to)}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
