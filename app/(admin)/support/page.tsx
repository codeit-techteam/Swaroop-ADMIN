"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DetailRow } from "@/components/shared/detail-drawer";
import { EntityWorkbench } from "@/components/shared/entity-workbench";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import {
  listAdminSupportTickets,
  replyAdminSupportTicket,
  updateAdminSupportTicketStatus,
} from "@/lib/api/ops";
import { useAuthStore } from "@/store/auth-store";
import type { SupportTicket } from "@/types";

const STATUS_TO_API: Record<
  SupportTicket["status"],
  "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED"
> = {
  Open: "OPEN",
  "In Progress": "IN_PROGRESS",
  Waiting: "WAITING_CUSTOMER",
  Resolved: "RESOLVED",
  Closed: "CLOSED",
};

export default function SupportTicketsPage() {
  const user = useAuthStore((s) => s.user);
  const [rows, setRows] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    id: string;
    status: SupportTicket["status"];
  } | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await listAdminSupportTickets());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load support tickets.",
      );
      setRows([]);
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
        title="Support Tickets"
        description="Tickets raised from Customer Web, Customer App, Seller Web, and Seller App."
        loading={loading}
        loadingError={loadError}
        onRetry={() => void load()}
        rows={rows}
        getRowId={(r) => r.id}
        columns={[
          {
            key: "ticket",
            header: "Ticket ID",
            sortable: true,
            accessor: (r) => r.ticketNumber,
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
            key: "created",
            header: "Created",
            render: (r) => formatDateTime(r.createdAt),
          },
          {
            key: "source",
            header: "Source",
            render: (r) => <SourceBadge source={r.source} />,
          },
        ]}
        searchPlaceholder="Search tickets"
        searchFn={(r, q) =>
          `${r.ticketNumber} ${r.organizationName} ${r.requesterName} ${r.subject} ${r.category}`
            .toLowerCase()
            .includes(q)
        }
        filters={[
          { label: "Open", value: "Open", predicate: (r) => r.status === "Open" },
          {
            label: "In Progress",
            value: "In Progress",
            predicate: (r) => r.status === "In Progress",
          },
          {
            label: "Waiting",
            value: "Waiting",
            predicate: (r) => r.status === "Waiting",
          },
          {
            label: "Resolved",
            value: "Resolved",
            predicate: (r) => r.status === "Resolved",
          },
          {
            label: "Closed",
            value: "Closed",
            predicate: (r) => r.status === "Closed",
          },
          {
            label: "Customer",
            value: "Customer",
            predicate: (r) => r.requesterType === "Customer",
          },
          {
            label: "Seller",
            value: "Seller",
            predicate: (r) => r.requesterType === "Seller",
          },
        ]}
        emptyTitle="No support tickets found."
        emptyDescription="Tickets raised by customers and sellers will appear here."
        exportName="support-tickets"
        exportRow={(r) => ({
          id: r.ticketNumber,
          org: r.organizationName,
          status: r.status,
          category: r.category,
          source: r.source,
        })}
        drawerTitle={(r) => r.ticketNumber}
        renderDetails={(r) => (
          <div className="space-y-4">
            <dl>
              <DetailRow label="Organization" value={r.organizationName} />
              <DetailRow
                label="Requester"
                value={`${r.requesterName} (${r.requesterType})`}
              />
              <DetailRow label="Category" value={r.category} />
              <DetailRow label="Subject" value={r.subject} />
              <DetailRow label="Description" value={r.description} />
              <DetailRow
                label="Priority"
                value={<StatusBadge value={r.priority} />}
              />
              <DetailRow label="Status" value={<StatusBadge value={r.status} />} />
              <DetailRow label="Assigned" value={r.assignedTo} />
              <DetailRow label="Created" value={formatDateTime(r.createdAt)} />
              <DetailRow
                label="Source"
                value={<SourceBadge source={r.source} />}
              />
            </dl>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Conversation
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3 text-sm">
                {r.messages.length === 0 ? (
                  <p className="text-muted-foreground">No messages yet.</p>
                ) : (
                  r.messages.map((m) => (
                    <div key={m.id} className="border-b border-border/60 pb-2 last:border-0">
                      <p className="font-medium">
                        {m.senderName}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {formatDateTime(m.createdAt)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">{m.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Reply to requester…"
                value={replyingId === r.id ? replyDraft : ""}
                onChange={(e) => {
                  setReplyingId(r.id);
                  setReplyDraft(e.target.value);
                }}
                rows={3}
              />
              <Button
                size="sm"
                disabled={!replyDraft.trim() || replyingId !== r.id}
                onClick={async () => {
                  try {
                    const updated = await replyAdminSupportTicket(r.id, replyDraft.trim());
                    setRows((current) =>
                      current.map((row) => (row.id === r.id ? updated : row)),
                    );
                    setReplyDraft("");
                    setReplyingId(null);
                    toast.success("Reply sent");
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Reply failed",
                    );
                  }
                }}
              >
                Send reply
              </Button>
            </div>
          </div>
        )}
        drawerFooter={(r) => (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPending({ id: r.id, status: "In Progress" })}
            >
              Mark In Progress
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPending({ id: r.id, status: "Waiting" })}
            >
              Waiting on Requester
            </Button>
            <Button
              size="sm"
              onClick={() => setPending({ id: r.id, status: "Resolved" })}
            >
              Resolve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setPending({ id: r.id, status: "Closed" })}
            >
              Close
            </Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title="Update support ticket"
        description={`Set status to ${pending?.status ?? ""} for this ticket. Action is attributed to ${user?.name ?? "Admin"}.`}
        destructive={pending?.status === "Closed"}
        onConfirm={async () => {
          if (!pending) return;
          try {
            const updated = await updateAdminSupportTicketStatus(
              pending.id,
              STATUS_TO_API[pending.status],
            );
            setRows((current) =>
              current.map((row) => (row.id === pending.id ? updated : row)),
            );
            toast.success("Ticket updated");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Update failed",
            );
          } finally {
            setPending(null);
          }
        }}
      />
    </>
  );
}
