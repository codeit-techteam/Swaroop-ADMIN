"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateTime } from "@/lib/format";
import { useDataStore } from "@/store/data-store";
import { useProcurementStore } from "@/store/procurement-store";

export function NotificationMenu() {
  const router = useRouter();
  const items = useDataStore((s) => s.notifications);
  const markRead = useDataStore((s) => s.markNotificationRead);
  const unread = items.filter((item) => !item.read).length;
  const selectProcurement = useProcurementStore((s) => s.selectProcurement);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          <Button size="sm" variant="ghost" onClick={() => router.push("/notifications")}>
            View all
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.slice(0, 8).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left last:border-0 hover:bg-slate-50 ${item.read ? "" : "bg-sky-50/70"}`}
              onClick={() => {
                markRead(item.id);
                const match = item.href.match(/id=([^&]+)/);
                if (item.href.startsWith("/procurement") && match?.[1]) {
                  selectProcurement(match[1]);
                }
                router.push(item.href);
              }}
            >
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.body}</p>
              <p className="text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
