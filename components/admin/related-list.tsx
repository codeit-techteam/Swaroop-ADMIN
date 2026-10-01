import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime } from "@/lib/format";

export function RelatedList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{
    id: string;
    href?: string;
    title: string;
    subtitle?: string;
    status?: string;
    when?: string;
  }>;
}) {
  return (
    <section className="rounded-md border bg-white p-4 shadow-soft">
      <p className="section-label mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => {
            const body = (
              <span className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{row.title}</span>
                  {row.subtitle ? <span className="ml-2 text-muted-foreground">{row.subtitle}</span> : null}
                </span>
                <span className="flex items-center gap-2">
                  {row.when ? <span className="text-xs text-muted-foreground">{formatDateTime(row.when)}</span> : null}
                  {row.status ? <StatusBadge value={row.status} /> : null}
                </span>
              </span>
            );
            return (
              <li key={row.id}>
                {row.href ? <Link href={row.href} className="block hover:bg-slate-50">{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
