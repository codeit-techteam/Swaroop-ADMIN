"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import { CreditSourceBadge } from "@/components/credit/credit-source-badge";
import { useCreditQuery } from "@/components/credit/use-credit-query";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { getCreditApplicationStats, listCreditApplications } from "@/lib/api/credit";
import {
  APPLICATION_STATUS_FILTERS,
  CREDIT_KYC_LABELS,
  CREDIT_SOURCES,
  CREDIT_SOURCE_LABELS,
  creditApplicationStatusLabel,
  displayMoney,
} from "@/lib/credit-format";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CreditApplicationStats } from "@/types/credit";

const DATE_PRESETS = [
  { value: "", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom range" },
] as const;

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "submitted_desc", label: "Recently submitted" },
  { value: "updated_desc", label: "Recently updated" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Highest amount" },
  { value: "amount_asc", label: "Lowest amount" },
] as const;

const selectClass = "h-9 rounded-md border bg-white px-2 text-sm";

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Date filter → ISO range in the admin's local time zone. */
function dateRange(preset: string, from: string, to: string): { from?: string; to?: string } {
  const now = new Date();
  if (preset === "today") return { from: startOfLocalDay(now).toISOString() };
  if (preset === "7d" || preset === "30d") {
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() - (preset === "7d" ? 6 : 29));
    return { from: start.toISOString() };
  }
  if (preset === "month") {
    const start = startOfLocalDay(now);
    start.setDate(1);
    return { from: start.toISOString() };
  }
  if (preset === "custom") {
    return {
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    };
  }
  return {};
}

export default function CreditApplicationsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <CreditApplicationsList />
    </Suspense>
  );
}

function CreditApplicationsList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const filters = {
    search: params.get("search") ?? "",
    status: params.get("status") ?? "",
    source: params.get("source") ?? "",
    kycStatus: params.get("kyc") ?? "",
    date: params.get("date") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    sort: params.get("sort") ?? "newest",
    page: Math.max(1, Number(params.get("page") ?? 1) || 1),
  };

  const update = useCallback(
    (changes: Record<string, string | number>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(changes).forEach(([key, value]) => {
        if (value === "" || value === undefined) next.delete(key);
        else next.set(key, String(value));
      });
      if (resetPage && !("page" in changes)) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const range = useMemo(
    () => dateRange(filters.date, filters.from, filters.to),
    [filters.date, filters.from, filters.to],
  );

  const { data, error, loading, reload } = useCreditQuery(
    () =>
      listCreditApplications({
        search: filters.search,
        status: filters.status || undefined,
        source: filters.source || undefined,
        kycStatus: filters.kycStatus || undefined,
        sort: filters.sort,
        from: range.from,
        to: range.to,
        page: filters.page,
        limit: 20,
      }),
    [
      filters.search,
      filters.status,
      filters.source,
      filters.kycStatus,
      filters.sort,
      range.from,
      range.to,
      filters.page,
    ],
  );
  const stats = useCreditQuery(() => getCreditApplicationStats(), []);
  const activeFilters = [filters.search, filters.status, filters.source, filters.kycStatus, filters.date].some(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Credit Applications"
        description="Every Request Credit application from the website, customer web and apps. Seller approval is not part of this workflow."
        breadcrumbs={[{ label: "Credit Management", href: "/credit" }, { label: "Applications" }]}
      />

      <StatsStrip
        stats={stats.data}
        activeStatus={filters.status}
        activeSource={filters.source}
        onSelect={(changes) => update(changes)}
      />

      <CreditToolbar
        search={filters.search}
        onSearch={(value) => update({ search: value })}
        searchPlaceholder="Application number, company, GSTIN, email or mobile"
        status={filters.status}
        statuses={APPLICATION_STATUS_FILTERS.map((item) => ({ value: item.value, label: item.label }))}
        onStatus={(value) => update({ status: value })}
        extra={
          <>
            <select
              aria-label="Source"
              className={selectClass}
              value={filters.source}
              onChange={(event) => update({ source: event.target.value })}
            >
              <option value="">All sources</option>
              {CREDIT_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {CREDIT_SOURCE_LABELS[source]}
                </option>
              ))}
              <option value="NOT_RECORDED">Not recorded</option>
            </select>
            <select
              aria-label="KYC status"
              className={selectClass}
              value={filters.kycStatus}
              onChange={(event) => update({ kyc: event.target.value })}
            >
              <option value="">All KYC</option>
              {Object.entries(CREDIT_KYC_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="Submitted date"
              className={selectClass}
              value={filters.date}
              onChange={(event) =>
                update({ date: event.target.value, ...(event.target.value !== "custom" ? { from: "", to: "" } : {}) })
              }
            >
              {DATE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
            {filters.date === "custom" ? (
              <>
                <input
                  type="date"
                  aria-label="From date"
                  className={selectClass}
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(event) => update({ from: event.target.value })}
                />
                <input
                  type="date"
                  aria-label="To date"
                  className={selectClass}
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(event) => update({ to: event.target.value })}
                />
              </>
            ) : null}
            <select
              aria-label="Sort"
              className={selectClass}
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value })}
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
            {activeFilters ? (
              <button
                type="button"
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => router.replace(pathname, { scroll: false })}
              >
                Clear filters
              </button>
            ) : null}
          </>
        }
      />

      {loading ? (
        <>
          <p className="text-sm text-muted-foreground">Loading credit applications…</p>
          <TableSkeleton />
        </>
      ) : error ? (
        <ErrorState title="Unable to load credit information. Please try again." description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            onRowClick={(row) => router.push(`/credit/applications/${row.id}`)}
            emptyTitle={activeFilters ? "No applications match these filters." : "No credit applications yet."}
            emptyDescription={
              activeFilters
                ? "Try a different source, status or date range."
                : "Applications submitted from the website and Swaroop apps will appear here."
            }
            columns={[
              {
                key: "number",
                header: "Application",
                render: (r) => (
                  <span className="font-medium text-foreground" title={`ID ${r.id}`}>
                    {r.applicationNumber}
                  </span>
                ),
              },
              { key: "company", header: "Company", accessor: (r) => r.customer.name },
              { key: "applicant", header: "Applicant", accessor: (r) => r.customer.contactName ?? "—" },
              { key: "mobile", header: "Mobile", accessor: (r) => r.customer.phone ?? "—" },
              { key: "email", header: "Email", accessor: (r) => r.customer.email ?? "—" },
              { key: "gstin", header: "GSTIN", accessor: (r) => r.customer.gstin ?? "—" },
              { key: "limit", header: "Requested Credit", render: (r) => displayMoney(r.requestedLimit) },
              {
                key: "kyc",
                header: "KYC",
                render: (r) => <StatusBadge value={CREDIT_KYC_LABELS[r.kycStatus] ?? r.kycStatus} />,
              },
              {
                key: "status",
                header: "Status",
                render: (r) => <StatusBadge value={creditApplicationStatusLabel(r.displayStatus ?? r.status)} />,
              },
              { key: "source", header: "Source", render: (r) => <CreditSourceBadge source={r.source} /> },
              {
                key: "submitted",
                header: "Submitted",
                render: (r) => (r.submittedAt ? formatDateTime(r.submittedAt) : "Not submitted"),
              },
              { key: "admin", header: "Assigned Admin", accessor: (r) => r.assignedAdminName ?? "Unassigned" },
              { key: "updated", header: "Last Updated", render: (r) => formatDateTime(r.updatedAt) },
              {
                key: "actions",
                header: "Actions",
                render: (r) => (
                  <button
                    type="button"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/credit/applications/${r.id}`);
                    }}
                  >
                    Open
                  </button>
                ),
              },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={(page) => update({ page }, false)} />
        </>
      )}
    </div>
  );
}

function StatsStrip({
  stats,
  activeStatus,
  activeSource,
  onSelect,
}: {
  stats: CreditApplicationStats | null;
  activeStatus: string;
  activeSource: string;
  onSelect: (changes: Record<string, string>) => void;
}) {
  const tiles: Array<{ label: string; value: number | undefined; changes: Record<string, string>; active: boolean }> = [
    {
      label: "Total submitted",
      value: stats?.total,
      changes: { status: "", source: "" },
      active: !activeStatus && !activeSource,
    },
    {
      label: "From website",
      value: stats?.website,
      changes: { source: "WEBSITE", status: "" },
      active: activeSource === "WEBSITE" && !activeStatus,
    },
    {
      label: "Awaiting review",
      value: stats?.submitted,
      changes: { status: "PENDING", source: "" },
      active: activeStatus === "PENDING",
    },
    {
      label: "Documents required",
      value: stats?.documentsRequired,
      changes: { status: "DOCUMENTS_REQUIRED", source: "" },
      active: activeStatus === "DOCUMENTS_REQUIRED",
    },
    {
      label: "Approved",
      value: stats?.approved,
      changes: { status: "APPROVED", source: "" },
      active: activeStatus === "APPROVED",
    },
    {
      label: "Rejected",
      value: stats?.rejected,
      changes: { status: "REJECTED", source: "" },
      active: activeStatus === "REJECTED",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <button
          key={tile.label}
          type="button"
          aria-pressed={tile.active}
          onClick={() => onSelect(tile.changes)}
          className={cn(
            "rounded-lg border bg-white px-3 py-2.5 text-left transition-colors hover:border-primary/40",
            tile.active && "border-primary ring-1 ring-primary/30",
          )}
        >
          <span className="block text-xs text-muted-foreground">{tile.label}</span>
          <span className="mt-0.5 block text-xl font-semibold tabular-nums">{tile.value ?? "—"}</span>
        </button>
      ))}
    </div>
  );
}
