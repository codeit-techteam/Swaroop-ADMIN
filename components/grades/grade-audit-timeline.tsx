import { formatDateTime } from "@/lib/format";
import type { GradeAuditEvent } from "@/types/grade";

export function GradeAuditTimeline({ events }: { events: GradeAuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit events for this grade yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="relative border-l border-slate-200 pl-4">
          <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary" />
          <p className="text-sm font-medium">{event.action}</p>
          <p className="text-xs text-muted-foreground">{event.gradeCode}</p>
          {event.field ? (
            <p className="mt-1 text-xs">
              {event.field}: <span className="font-medium">{event.oldValue ?? "—"}</span>
              {" → "}
              <span className="font-medium">{event.newValue ?? "—"}</span>
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-muted-foreground">
            {event.admin} · {formatDateTime(event.timestamp)}
          </p>
        </li>
      ))}
    </ol>
  );
}
