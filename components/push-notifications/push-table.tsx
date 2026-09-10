"use client";

import { Copy, Eye, MoreHorizontal, Pencil, Send, Trash2, XCircle } from "lucide-react";

import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  audienceLabel,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  PLATFORM_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/push-notification-utils";
import { cn } from "@/lib/utils";
import type { PushNotification } from "@/types/push-notification";

interface PushTableProps {
  rows: PushNotification[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onView: (item: PushNotification) => void;
  onEdit: (item: PushNotification) => void;
  onPreview: (item: PushNotification) => void;
  onDuplicate: (item: PushNotification) => void;
  onSend: (item: PushNotification) => void;
  onCancel: (item: PushNotification) => void;
  onDelete: (item: PushNotification) => void;
}

export function PushTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onView,
  onEdit,
  onPreview,
  onDuplicate,
  onSend,
  onCancel,
  onDelete,
}: PushTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => onToggleAll(allSelected ? [] : rows.map((row) => row.id))}
                  aria-label="Select all notifications"
                />
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Campaign</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Audience</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Platforms</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Channels</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Priority</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Schedule / Sent</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Delivered</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn("cursor-pointer", selectedIds.includes(row.id) && "bg-sky-50/50")}
                onClick={() => onView(row)}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={() => onToggle(row.id)}
                    aria-label={`Select ${row.name}`}
                  />
                </TableCell>
                <TableCell>
                  <p className="font-medium text-slate-900">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.id} · {row.name} · {CATEGORY_LABELS[row.category]}
                  </p>
                </TableCell>
                <TableCell className="max-w-[200px] text-sm">{audienceLabel(row)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.platforms.map((platform) => (
                      <SourceBadge key={platform} source={PLATFORM_LABELS[platform]} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {row.channels.map((channel) => CHANNEL_LABELS[channel]).join(" · ")}
                </TableCell>
                <TableCell>
                  <StatusBadge value={PRIORITY_LABELS[row.priority]} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {row.status === "SENT" && row.sentAt
                    ? formatDateTime(row.sentAt)
                    : row.scheduledDate
                      ? `${row.scheduledDate} ${row.scheduledTime}`
                      : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {row.status === "SENT" ? formatNumber(row.delivered) : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge value={STATUS_LABELS[row.status]} />
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon" variant="ghost" aria-label="Notification actions">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(row)}>
                        <Eye className="size-3.5" />
                        View
                      </DropdownMenuItem>
                      {row.status === "DRAFT" || row.status === "SCHEDULED" ? (
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          <Pencil className="size-3.5" />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => onPreview(row)}>
                        <Eye className="size-3.5" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(row)}>
                        <Copy className="size-3.5" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {row.status === "DRAFT" || row.status === "SCHEDULED" || row.status === "FAILED" ? (
                        <DropdownMenuItem onClick={() => onSend(row)}>
                          <Send className="size-3.5" />
                          Send now
                        </DropdownMenuItem>
                      ) : null}
                      {row.status === "SCHEDULED" ? (
                        <DropdownMenuItem onClick={() => onCancel(row)}>
                          <XCircle className="size-3.5" />
                          Cancel
                        </DropdownMenuItem>
                      ) : null}
                      {row.status !== "SENT" ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-700" onClick={() => onDelete(row)}>
                            <Trash2 className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
