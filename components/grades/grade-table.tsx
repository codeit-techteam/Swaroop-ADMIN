"use client";

import {
  ArrowUpDown,
  Eye,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { GradeStatusBadge } from "@/components/grades/grade-status-badge";
import { GradeVisibilityBadge } from "@/components/grades/grade-visibility-badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/format";
import { usageCount } from "@/lib/grade-utils";
import { cn } from "@/lib/utils";
import { useGradeStore } from "@/store/grade-store";
import { GRADE_PAGE_SIZES, type Grade, type GradeSortKey } from "@/types/grade";

interface GradeTableProps {
  rows: Grade[];
  total: number;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onView: (grade: Grade) => void;
  onEdit: (grade: Grade) => void;
  onToggleStatus: (grade: Grade) => void;
  onDelete: (grade: Grade) => void;
  canUpdate?: boolean;
  canStatus?: boolean;
  canDelete?: boolean;
}

const SORTABLE: Array<{ key: GradeSortKey; label: string }> = [
  { key: "gradeCode", label: "Grade ID" },
  { key: "gradeName", label: "Grade Name" },
  { key: "categoryName", label: "Category" },
];

export function GradeTable({
  rows,
  total,
  selectedIds,
  onToggle,
  onToggleAll,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
  canUpdate = true,
  canStatus = true,
  canDelete = true,
}: GradeTableProps) {
  const sort = useGradeStore((s) => s.sort);
  const setSort = useGradeStore((s) => s.setSort);
  const pagination = useGradeStore((s) => s.pagination);
  const setPagination = useGradeStore((s) => s.setPagination);
  const pageRows = rows;
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selectedIds.includes(row.id));
  const start = total === 0 ? 0 : pagination.page * pagination.pageSize + 1;
  const end = Math.min(total, (pagination.page + 1) * pagination.pageSize);
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  function toggleSort(key: GradeSortKey) {
    if (sort.key === key) {
      setSort({ key, dir: sort.dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key, dir: key === "updatedAt" ? "desc" : "asc" });
    }
  }

  return (
    <TooltipProvider>
      <div className="overflow-hidden rounded-md border bg-white">
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onToggleAll(allSelected ? [] : pageRows.map((row) => row.id))}
                    aria-label="Select all grades"
                  />
                </TableHead>
                {SORTABLE.map((column) => (
                  <TableHead key={column.key} className="text-[11px] uppercase tracking-wide">
                    <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <ArrowUpDown className="size-3" />
                    </button>
                  </TableHead>
                ))}
                <TableHead className="text-[11px] uppercase tracking-wide">Description</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Applications</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Customer Visible</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Seller Visible</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("status")}>
                    Status
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("updatedAt")}>
                    Updated At
                    <ArrowUpDown className="size-3" />
                  </button>
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const used = usageCount(row.usage);
                return (
                  <TableRow
                    key={row.id}
                    className={cn("cursor-pointer", selectedIds.includes(row.id) && "bg-sky-50/50")}
                    onClick={() => onView(row)}
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onCheckedChange={() => onToggle(row.id)}
                        aria-label={`Select ${row.gradeCode}`}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="font-mono text-xs font-semibold text-slate-900">{row.gradeCode}</p>
                      <p className="text-[11px] text-muted-foreground">{row.id}</p>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{row.gradeName}</TableCell>
                    <TableCell>{row.categoryName}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                      {row.description || "—"}
                    </TableCell>
                    <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                      {row.applications.slice(0, 3).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <GradeVisibilityBadge visible={row.customerVisible} />
                    </TableCell>
                    <TableCell>
                      <GradeVisibilityBadge visible={row.sellerVisible} />
                    </TableCell>
                    <TableCell>
                      <GradeStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(row.updatedAt)}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="ghost" aria-label="View grade" onClick={() => onView(row)}>
                          <Eye className="size-4" />
                        </Button>
                        {canUpdate ? (
                          <Button type="button" size="icon" variant="ghost" aria-label="Edit grade" onClick={() => onEdit(row)}>
                            <Pencil className="size-4" />
                          </Button>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="icon" variant="ghost" aria-label="More grade actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onView(row)}>
                              <Eye className="size-3.5" />
                              View
                            </DropdownMenuItem>
                            {canUpdate ? (
                              <DropdownMenuItem onClick={() => onEdit(row)}>
                                <Pencil className="size-3.5" />
                                Edit
                              </DropdownMenuItem>
                            ) : null}
                            {canStatus ? (
                              <DropdownMenuItem onClick={() => onToggleStatus(row)}>
                                {row.status === "ACTIVE" ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
                                {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuSeparator />
                            {canDelete && used > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <DropdownMenuItem disabled>
                                      <Trash2 className="size-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>This grade is referenced by existing transactions and cannot be deleted.</TooltipContent>
                              </Tooltip>
                            ) : canDelete ? (
                              <DropdownMenuItem className="text-red-700" onClick={() => onDelete(row)}>
                                <Trash2 className="size-3.5" />
                                Delete
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 p-3 md:hidden">
          {pageRows.map((row) => (
            <article key={row.id} className="rounded-md border bg-white p-3 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedIds.includes(row.id)}
                    onCheckedChange={() => onToggle(row.id)}
                    aria-label={`Select ${row.gradeCode}`}
                  />
                  <div>
                    <p className="font-mono text-xs font-semibold">{row.gradeCode}</p>
                    <p className="text-sm font-medium">{row.gradeName}</p>
                    <p className="text-xs text-muted-foreground">{row.categoryName}</p>
                  </div>
                </div>
                <GradeStatusBadge status={row.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{row.description || "No description"}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <span>
                  Customer: <GradeVisibilityBadge visible={row.customerVisible} compact />
                </span>
                <span>
                  Seller: <GradeVisibilityBadge visible={row.sellerVisible} compact />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => onView(row)}>
                  View
                </Button>
                {canUpdate ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(row)}>
                    Edit
                  </Button>
                ) : null}
                {canStatus ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onToggleStatus(row)}>
                    {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" asChild>
                  <Link href={`/master-data/grades/${row.id}`}>Open</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {start}–{end} of {total} grades
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => setPagination({ page: 0, pageSize: Number(value) })}
            >
              <SelectTrigger className="h-8 w-[88px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRADE_PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.page === 0}
              onClick={() => setPagination({ page: pagination.page - 1 })}
            >
              Previous
            </Button>
            <span className="px-1">
              {pagination.page + 1} / {pageCount}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.page + 1 >= pageCount}
              onClick={() => setPagination({ page: pagination.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
