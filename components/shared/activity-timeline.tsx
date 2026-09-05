import { formatDateTime } from "@/lib/format";
import { SourceBadge } from "@/components/shared/source-badge";
import type { AppSource } from "@/types";

interface TimelineItem {
  id: string;
  title: string;
  detail?: string;
  time: string;
  source?: AppSource;
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="relative border-l border-slate-200 pl-4">
          <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
            </div>
            {item.source ? <SourceBadge source={item.source} /> : null}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.time)}</p>
        </li>
      ))}
    </ol>
  );
}
