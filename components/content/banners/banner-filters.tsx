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
import {
  ALL_PLACEMENTS,
  CAMPAIGN_TYPE_LABELS,
  PLATFORM_LABELS,
  STATUS_LABELS,
} from "@/lib/banner-utils";
import { useBannerStore } from "@/store/banner-store";
import type { BannerPlacement, BannerPlatform, BannerStatus, CampaignType } from "@/types/banner";

const PLATFORMS = Object.entries(PLATFORM_LABELS) as [BannerPlatform, string][];
const STATUSES = Object.entries(STATUS_LABELS) as [BannerStatus, string][];
const CAMPAIGNS = Object.entries(CAMPAIGN_TYPE_LABELS) as [CampaignType, string][];

export function BannerFilters() {
  const filters = useBannerStore((s) => s.filters);
  const setFilters = useBannerStore((s) => s.setFilters);
  const clearFilters = useBannerStore((s) => s.clearFilters);

  return (
    <section className="rounded-md border bg-white p-3 shadow-soft">
      <div className="grid gap-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => setFilters({ search: event.target.value })}
            placeholder="Search banners..."
            className="pl-8"
          />
        </div>
        <Select
          value={filters.platform}
          onValueChange={(value) => setFilters({ platform: value as BannerPlatform | "ALL" })}
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
          value={filters.placement}
          onValueChange={(value) => setFilters({ placement: value as BannerPlacement | "ALL" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Placement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Placements</SelectItem>
            {ALL_PLACEMENTS.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ status: value as BannerStatus | "ALL" })}
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
          value={filters.campaignType}
          onValueChange={(value) => setFilters({ campaignType: value as CampaignType | "ALL" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Campaign type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Campaign Types</SelectItem>
            {CAMPAIGNS.map(([value, label]) => (
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
