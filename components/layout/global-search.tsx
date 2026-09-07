"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { searchPlatform, type SearchHit } from "@/services/searchService";
import { useUiStore } from "@/store/ui-store";

const GROUPS: SearchHit["group"][] = [
  "Customers",
  "Sellers",
  "Procurement",
  "Orders",
  "Shipments",
  "Products",
  "Purchase Requests",
  "Offers",
  "Banners",
];

export function GlobalSearch() {
  const open = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const hits = useMemo(() => searchPlatform(query), [query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <DialogDescription className="sr-only">
          Search banners, orders, clients, sellers, shipments and catalog grades.
        </DialogDescription>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search banners, orders, clients, sellers..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No matching records across the PetroTrade ecosystem.</CommandEmpty>
            {GROUPS.map((group) => {
              const items = hits.filter((hit) => hit.group === group);
              if (items.length === 0) return null;
              return (
                <CommandGroup key={group} heading={group}>
                  {items.map((item) => (
                    <CommandItem
                      key={`${group}-${item.id}`}
                      value={`${item.group}-${item.id}-${item.title}`}
                      onSelect={() => {
                        setSearchOpen(false);
                        setQuery("");
                        router.push(item.href);
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
