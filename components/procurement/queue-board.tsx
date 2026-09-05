"use client";

import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatInr } from "@/lib/format";
import { applyFilters, QUEUE_COLUMNS, queueColumnForStatus, type QueueColumnKey } from "@/lib/procurement";
import { cn } from "@/lib/utils";
import { useProcurementStore } from "@/store/procurement-store";
import type { Procurement } from "@/types";

export function ProcurementQueueBoard() {
  const procurements = useProcurementStore((s) => s.procurements);
  const filters = useProcurementStore((s) => s.filters);
  const selectProcurement = useProcurementStore((s) => s.selectProcurement);
  const moveToQueueColumn = useProcurementStore((s) => s.moveToQueueColumn);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<QueueColumnKey | null>(null);

  const rows = useMemo(
    () =>
      applyFilters(procurements, {
        search: filters.search,
        quick: filters.quick,
        kpi: filters.kpi,
        advanced: filters.advanced,
      }),
    [procurements, filters],
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {QUEUE_COLUMNS.map((column) => {
        const cards = rows.filter((row) => queueColumnForStatus(row.status) === column.key);
        return (
          <section
            key={column.key}
            onDragOver={(event) => {
              event.preventDefault();
              setOverColumn(column.key);
            }}
            onDragLeave={() => setOverColumn((current) => (current === column.key ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              const id = event.dataTransfer.getData("text/plain") || draggingId;
              if (id) moveToQueueColumn(id, column.key);
              setDraggingId(null);
              setOverColumn(null);
            }}
            className={cn(
              "flex w-[220px] shrink-0 flex-col rounded-md border bg-slate-50/80",
              overColumn === column.key && "border-primary/50 bg-sky-50/70",
            )}
          >
            <header className="flex items-center justify-between border-b px-3 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{column.label}</h3>
              <span className="text-[11px] text-muted-foreground">{cards.length}</span>
            </header>
            <div className="flex min-h-[160px] flex-col gap-2 p-2">
              {cards.map((row) => (
                <QueueCard
                  key={row.id}
                  row={row}
                  dragging={draggingId === row.id}
                  onDragStart={() => setDraggingId(row.id)}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverColumn(null);
                  }}
                  onOpen={() => selectProcurement(row.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function QueueCard({
  row,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  row: Procurement;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", row.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "cursor-grab rounded-md border bg-white p-2.5 shadow-soft active:cursor-grabbing",
        dragging && "opacity-50",
      )}
    >
      <p className="text-xs font-semibold">{row.id}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{row.commodity}</p>
      <p className="mt-1 truncate text-[11px]">{row.supplier}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium">{formatInr(row.estimatedCost)}</span>
        <StatusBadge value={row.status} />
      </div>
    </article>
  );
}
