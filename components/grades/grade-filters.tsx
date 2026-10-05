"use client";

import { Check, ChevronsUpDown, RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLiveCategories } from "@/lib/grade-utils";
import { cn } from "@/lib/utils";
import { useGradeStore } from "@/store/grade-store";
import type { GradeFacetOption, GradeStatus, GradeVisibilityFilter, GradeYesNoFilter } from "@/types/grade";

export function GradeFilters() {
  const filters = useGradeStore((s) => s.filters);
  const facets = useGradeStore((s) => s.facets);
  const setFilters = useGradeStore((s) => s.setFilters);
  const resetFilters = useGradeStore((s) => s.resetFilters);
  const [search, setSearch] = useState(filters.search);

  useEffect(() => {
    setSearch(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== filters.search) setFilters({ search });
    }, 300);
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
            placeholder="Search grade no., manufacturer, group, name, code..."
            className="pl-8"
          />
        </div>
        <Select value={filters.categoryId} onValueChange={(value) => setFilters({ categoryId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {getLiveCategories().map((category) => (
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
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <FacetCombobox
          label="Grade Group"
          allLabel="All Grade Groups"
          value={filters.gradeGroup}
          options={facets.gradeGroups}
          onChange={(gradeGroup) => setFilters({ gradeGroup })}
        />
        <FacetCombobox
          label="Manufacturer"
          allLabel="All Manufacturers"
          value={filters.manufacturer}
          options={facets.manufacturers}
          onChange={(manufacturer) => setFilters({ manufacturer })}
        />
        <Select
          value={filters.inTodaysDelhiPriceList}
          onValueChange={(value) => setFilters({ inTodaysDelhiPriceList: value as GradeYesNoFilter })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Delhi Price List" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Delhi Price List · All</SelectItem>
            <SelectItem value="YES">In Today&apos;s Delhi List</SelectItem>
            <SelectItem value="NO">Not in Delhi List</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center lg:col-start-6 lg:justify-end">
          <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
            <RotateCcw className="size-3.5" />
            Reset Filters
          </Button>
        </div>
      </div>
    </section>
  );
}

function FacetCombobox({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: GradeFacetOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const select = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          className="h-9 w-full justify-between font-normal"
        >
          <span className={cn("truncate", value === "ALL" && "text-muted-foreground")}>
            {value === "ALL" ? allLabel : value}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={`__all__ ${allLabel}`} onSelect={() => select("ALL")}>
                <Check className={cn("size-3.5", value === "ALL" ? "opacity-100" : "opacity-0")} />
                {allLabel}
              </CommandItem>
              {options.map((option) => (
                <CommandItem key={option.name} value={option.name} onSelect={() => select(option.name)}>
                  <Check className={cn("size-3.5", value === option.name ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{option.name}</span>
                  <span className="text-xs text-muted-foreground">{option.gradeCount}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
