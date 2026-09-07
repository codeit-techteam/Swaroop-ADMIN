"use client";

import {
  Copy,
  Eye,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";

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
import { formatDate } from "@/lib/format";
import { CAMPAIGN_TYPE_LABELS, PLATFORM_LABELS, placementLabel, STATUS_LABELS } from "@/lib/banner-utils";
import { cn } from "@/lib/utils";
import type { Banner } from "@/types/banner";

interface BannerTableProps {
  rows: Banner[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onView: (banner: Banner) => void;
  onEdit: (banner: Banner) => void;
  onPreview: (banner: Banner) => void;
  onDuplicate: (banner: Banner) => void;
  onPause: (banner: Banner) => void;
  onActivate: (banner: Banner) => void;
  onDelete: (banner: Banner) => void;
}

export function BannerTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onView,
  onEdit,
  onPreview,
  onDuplicate,
  onPause,
  onActivate,
  onDelete,
}: BannerTableProps) {
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
                  aria-label="Select all banners"
                />
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Preview</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Banner Name</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Campaign</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Platform</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Placement</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Start Date</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">End Date</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Status</TableHead>
              <TableHead className="text-[11px] uppercase tracking-wide">Priority</TableHead>
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
                  <div className="h-10 w-16 overflow-hidden rounded border bg-slate-100">
                    {row.desktopImage || row.mobileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.desktopImage || row.mobileImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-slate-900">{row.name}</p>
                  <p className="text-xs text-muted-foreground">{row.id}</p>
                </TableCell>
                <TableCell>
                  <p>{row.campaignName}</p>
                  <p className="text-xs text-muted-foreground">{CAMPAIGN_TYPE_LABELS[row.campaignType]}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.platforms.map((platform) => (
                      <SourceBadge key={platform} source={PLATFORM_LABELS[platform]} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="max-w-[180px] text-sm">
                  {row.placements.map(placementLabel).join(", ")}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{formatDate(row.startDate)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">{formatDate(row.endDate)}</TableCell>
                <TableCell>
                  <StatusBadge value={STATUS_LABELS[row.status]} />
                </TableCell>
                <TableCell>
                  <span className="rounded border bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold">
                    P{row.priority}
                  </span>
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon" variant="ghost" aria-label="Banner actions">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(row)}>
                        <Eye className="size-3.5" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(row)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(row)}>
                        <Copy className="size-3.5" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onPreview(row)}>
                        <Eye className="size-3.5" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {row.status === "PAUSED" || row.status === "DRAFT" || row.status === "SCHEDULED" ? (
                        <DropdownMenuItem onClick={() => onActivate(row)}>
                          <Play className="size-3.5" />
                          Activate
                        </DropdownMenuItem>
                      ) : null}
                      {row.status === "ACTIVE" ? (
                        <DropdownMenuItem onClick={() => onPause(row)}>
                          <Pause className="size-3.5" />
                          Pause
                        </DropdownMenuItem>
                      ) : null}
                      {row.status === "PAUSED" ? (
                        <DropdownMenuItem onClick={() => onActivate(row)}>
                          <Play className="size-3.5" />
                          Resume
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-700" onClick={() => onDelete(row)}>
                        <Trash2 className="size-3.5" />
                        Delete
                      </DropdownMenuItem>
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
