"use client";

import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GRADE_CATEGORIES } from "@/lib/mock-data/grades";
import { useGradeStore } from "@/store/grade-store";
import type { GradeStatus, GradeVisibilityFilter } from "@/types/grade";

export function GradeFilters() {
  const filters = useGradeStore((s) => s.filters);
  const setFilters = useGradeStore((s) => s.setFilters);
  const resetFilters = useGradeStore((s) => s.resetFilters);
  const [search, setSearch] = useState(filters.search);

  useEffect(() => {
    setSearch(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== filters.search) setFilters({ search });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search, filters.search, setFilters]);

  return (
    <section className="rounded-md border bg-white p-3 shadow-soft">
      <div className="grid gap-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search grade, category, ID..."
            className="pl-8"
          />
        </div>
        <Select value={filters.categoryId} onValueChange={(value) => setFilters({ categoryId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {GRADE_CATEGORIES.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ status: value as GradeStatus | "ALL" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.customerVisible}
          onValueChange={(value) => setFilters({ customerVisible: value as GradeVisibilityFilter })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Customer Visible" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Customer Visible · All</SelectItem>
            <SelectItem value="VISIBLE">Customer Visible</SelectItem>
            <SelectItem value="HIDDEN">Customer Hidden</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.sellerVisible}
          onValueChange={(value) => setFilters({ sellerVisible: value as GradeVisibilityFilter })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seller Visible" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Seller Visible · All</SelectItem>
            <SelectItem value="VISIBLE">Seller Visible</SelectItem>
            <SelectItem value="HIDDEN">Seller Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Created from</p>
          <Input
            type="date"
            value={filters.createdFrom}
            onChange={(event) => setFilters({ createdFrom: event.target.value })}
            className="w-[160px]"
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Created to</p>
          <Input
            type="date"
            value={filters.createdTo}
            onChange={(event) => setFilters({ createdTo: event.target.value })}
            className="w-[160px]"
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Updated from</p>
          <Input
            type="date"
            value={filters.updatedFrom}
            onChange={(event) => setFilters({ updatedFrom: event.target.value })}
            className="w-[160px]"
          />
        </div>
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Updated to</p>
          <Input
            type="date"
            value={filters.updatedTo}
            onChange={(event) => setFilters({ updatedTo: event.target.value })}
            className="w-[160px]"
          />
        </div>
        <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
          <RotateCcw className="size-3.5" />
          Reset Filters
        </Button>
      </div>
    </section>
  );
}
