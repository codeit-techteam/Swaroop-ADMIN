"use client";

import { formatDateTime } from "@/lib/format";
import { SourceBadge } from "@/components/shared/source-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useDataStore } from "@/store/data-store";
import { useProcurementStore } from "@/store/procurement-store";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/states";

const TYPES = ["All", "KYC", "Order", "Payment", "Dispatch", "Dispute", "Seller", "Customer", "Procurement", "Content", "System"] as const;

export default function NotificationsPage() {
  const router = useRouter();
  const items = useDataStore((s) => s.notifications);
  const markRead = useDataStore((s) => s.markNotificationRead);
  const markAll = useDataStore((s) => s.markAllNotificationsRead);
  const selectProcurement = useProcurementStore((s) => s.selectProcurement);
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("All");
  const unread = items.filter((item) => !item.read).length;
  const visible = useMemo(
    () => items.filter((item) => (filter === "All" ? true : item.type === filter)),
    [items, filter],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notifications"
        description={`${unread} unread`}
        actions={
          <Button size="sm" variant="outline" onClick={markAll}>
            Mark all read
          </Button>
        }
      />
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((type) => (
          <Button key={type} size="sm" variant={filter === type ? "default" : "outline"} onClick={() => setFilter(type)}>
            {type}
          </Button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState title="No notifications." description="Operational alerts will appear here." />
      ) : (
        <div className="divide-y rounded-md border bg-white">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50 ${item.read ? "" : "bg-sky-50/60"}`}
              onClick={() => {
                markRead(item.id);
                const match = item.href.match(/id=([^&]+)/);
                if (item.href.startsWith("/procurement") && match?.[1]) {
                  selectProcurement(match[1]);
                }
                router.push(item.href);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                <SourceBadge source={item.source} />
              </div>
              <p className="text-xs text-muted-foreground">{item.body}</p>
              <p className="text-[11px] text-muted-foreground">{item.type} · {formatDateTime(item.createdAt)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
