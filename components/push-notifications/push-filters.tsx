"use client";

import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LABELS, PLATFORM_LABELS, STATUS_LABELS } from "@/lib/push-notification-utils";
import { usePushNotificationStore } from "@/store/push-notification-store";
import type { PushCategory, PushPlatform, PushStatus } from "@/types/push-notification";

const PLATFORMS = Object.entries(PLATFORM_LABELS) as [PushPlatform, string][];
const STATUSES = Object.entries(STATUS_LABELS) as [PushStatus, string][];
const CATEGORIES = Object.entries(CATEGORY_LABELS) as [PushCategory, string][];

export function PushFilters() {
  const filters = usePushNotificationStore((s) => s.filters);
  const setFilters = usePushNotificationStore((s) => s.setFilters);
  const clearFilters = usePushNotificationStore((s) => s.clearFilters);

  return (
    <section className="rounded-md border bg-white p-3 shadow-soft">
      <div className="grid gap-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => setFilters({ search: event.target.value })}
            placeholder="Search title, audience, campaign..."
            className="pl-8"
          />
        </div>
        <Select
          value={filters.audience}
          onValueChange={(value) => setFilters({ audience: value as typeof filters.audience })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Audiences</SelectItem>
            <SelectItem value="CUSTOMER">Customer App / Web</SelectItem>
            <SelectItem value="SELLER">Seller App / Web</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.platform}
          onValueChange={(value) => setFilters({ platform: value as PushPlatform | "ALL" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Platforms</SelectItem>
            {PLATFORMS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ status: value as PushStatus | "ALL" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {STATUSES.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category}
          onValueChange={(value) => setFilters({ category: value as PushCategory | "ALL" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {CATEGORIES.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">From</p>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters({ dateFrom: event.target.value })}
            className="w-[160px]"
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">To</p>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters({ dateTo: event.target.value })}
            className="w-[160px]"
          />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
          <RotateCcw className="size-3.5" />
          Reset Filters
        </Button>
      </div>
    </section>
  );
}
