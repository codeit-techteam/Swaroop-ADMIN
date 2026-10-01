"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { describeApiFailure, searchAdmin, type AdminSearchResult } from "@/lib/api/control-center";
import { useUiStore } from "@/store/ui-store";

interface SearchHit {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  href: string;
}

function rows<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value : [];
}

function hitsFrom(result: AdminSearchResult): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const item of rows(result.users)) {
    const name = [item.firstName, item.lastName].filter(Boolean).join(" ") || item.email || item.id;
    hits.push({ id: item.id, group: "Users", title: name, subtitle: item.email ?? item.status, href: `/users/${item.id}` });
  }
  for (const item of rows(result.customers)) {
    hits.push({
      id: item.id,
      group: "Customers",
      title: item.organization?.name ?? item.user?.email ?? item.id,
      subtitle: item.status,
      href: `/customers/${item.id}`,
    });
  }
  for (const item of rows(result.sellers)) {
    hits.push({
      id: item.id,
      group: "Sellers",
      title: item.organization?.name ?? item.user?.email ?? item.id,
      subtitle: item.status,
      href: `/sellers/${item.id}`,
    });
  }
  for (const item of rows(result.grades)) {
    hits.push({ id: item.id, group: "Grades", title: item.displayName || item.name, subtitle: item.code, href: `/master-data/grades/${item.id}` });
  }
  for (const item of rows(result.products)) {
    hits.push({ id: item.id, group: "Products", title: item.name, subtitle: item.code, href: `/catalog?id=${item.id}` });
  }
  for (const item of rows(result.offers)) {
    hits.push({ id: item.id, group: "Offers", title: item.referenceNumber, subtitle: item.status, href: `/offers?id=${item.id}` });
  }
  for (const item of rows(result.purchaseRequests)) {
    hits.push({ id: item.id, group: "Purchase requests", title: item.referenceNumber, subtitle: item.status, href: `/procurement/${item.id}` });
  }
  for (const item of rows(result.purchaseOrders)) {
    hits.push({ id: item.id, group: "Purchase orders", title: item.referenceNumber, subtitle: item.status, href: `/orders?id=${item.id}` });
  }
  for (const item of rows(result.payments)) {
    hits.push({ id: item.id, group: "Payments", title: item.referenceNumber, subtitle: `${item.status} · ${item.amount}`, href: `/payments?id=${item.id}` });
  }
  for (const item of rows(result.invoices)) {
    hits.push({ id: item.id, group: "Invoices", title: item.invoiceNumber, subtitle: item.status, href: `/payments?id=${item.id}` });
  }
  for (const item of rows(result.shipments)) {
    hits.push({ id: item.id, group: "Shipments", title: item.referenceNumber, subtitle: item.status, href: `/logistics?id=${item.id}` });
  }
  for (const item of rows(result.importDeals)) {
    hits.push({ id: item.id, group: "Import deals", title: item.referenceNumber, subtitle: item.status, href: `/import-trading/deals/${item.id}` });
  }
  for (const item of rows(result.documents)) {
    hits.push({
      id: item.id,
      group: "Documents",
      title: item.originalFileName || item.fileName,
      subtitle: `${item.ownerType} · ${item.status}`,
      href: `/documents?id=${item.id}`,
    });
  }
  for (const item of rows(result.vehicles)) {
    hits.push({ id: item.id, group: "Vehicles", title: item.numberPlate, subtitle: `${item.type} · ${item.status}`, href: `/logistics?id=${item.id}` });
  }
  for (const item of rows(result.drivers)) {
    hits.push({ id: item.id, group: "Drivers", title: item.name, subtitle: item.licenseNumber ?? item.status, href: `/logistics?id=${item.id}` });
  }
  return hits;
}

export function GlobalSearch() {
  const open = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setHits([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void searchAdmin(term)
        .then((result) => {
          if (!cancelled) setHits(hitsFrom(result));
        })
        .catch((cause) => {
          if (!cancelled) {
            setHits([]);
            setError(describeApiFailure(cause));
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  const groups = [...new Set(hits.map((hit) => hit.group))];

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <DialogDescription className="sr-only">
          Search customers, sellers, orders, payments, import deals, shipments, and documents on the backend.
        </DialogDescription>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search customers, orders, deals, payments..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading ? <p className="px-3 py-4 text-sm text-muted-foreground">Searching…</p> : null}
            {error ? <p className="px-3 py-4 text-sm text-red-700">{error}</p> : null}
            {!loading && !error && query.trim().length >= 2 && hits.length === 0 ? (
              <CommandEmpty>No matching records.</CommandEmpty>
            ) : null}
            {query.trim().length < 2 && !loading ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Type at least 2 characters.</p>
            ) : null}
            {groups.map((group) => (
              <CommandGroup key={group} heading={group}>
                {hits
                  .filter((hit) => hit.group === group)
                  .map((item) => (
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
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
