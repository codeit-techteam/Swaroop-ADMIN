"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { CreateManagerDrawer } from "@/components/users/create-manager-drawer";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { exportUsers, listUsers, type DirectoryUser } from "@/lib/api/users";
import { formatDateTime } from "@/lib/format";

const ROLES = ["", "SUPER_ADMIN", "ADMIN", "SELLER_MANAGER", "SELLER", "CUSTOMER"];
const STATUSES = ["", "ACTIVE", "INACTIVE", "SUSPENDED", "INVITED", "REVOKED", "PENDING"];

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SELLER_MANAGER: "Seller Manager",
  SELLER: "Seller",
  CUSTOMER: "Customer",
};

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DirectoryUser[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers({
        page,
        limit: 20,
        search,
        role,
        status,
        sellerId,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setRows(result.data);
      setTotalPages(result.meta?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [from, page, role, search, sellerId, status, to]);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(handle);
  }, [load]);

  async function onExport() {
    try {
      const result = await exportUsers({ search, role, status, sellerId, from, to });
      const blob = new Blob([result.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Accounts across Customer App, Customer Web, Seller App, Seller Web and Admin Portal."
        actions={
          <>
            <Button variant="outline" onClick={() => void onExport()}>
              Export
            </Button>
            <Button onClick={() => setCreateOpen(true)}>+ Create Manager</Button>
          </>
        }
      />
      <div className="grid gap-2 md:grid-cols-6">
        <Input
          className="md:col-span-2"
          placeholder="Search users"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />
        <Select value={role} onChange={(value) => { setPage(1); setRole(value); }} options={ROLES} placeholder="All roles" labels={ROLE_LABEL} />
        <Select value={status} onChange={(value) => { setPage(1); setStatus(value); }} options={STATUSES} placeholder="All statuses" />
        <Input placeholder="Seller ID" value={sellerId} onChange={(event) => { setPage(1); setSellerId(event.target.value); }} />
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <DataTable
        manual
        rows={loading ? [] : rows}
        getRowId={(row) => row.id}
        onRowClick={(row) => router.push(`/users/${row.id}`)}
        emptyTitle={loading ? "Loading users…" : "No users found."}
        emptyDescription="Users from all five PetroTrade applications appear here."
        columns={[
          {
            key: "name",
            header: "Name",
            render: (row) => (
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-slate-500">{row.loginId || row.phone || ""}</p>
              </div>
            ),
          },
          { key: "email", header: "Email", render: (row) => row.email || "—" },
          {
            key: "role",
            header: "Role",
            render: (row) => (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {ROLE_LABEL[row.role ?? ""] ?? row.role ?? "—"}
              </span>
            ),
          },
          {
            key: "seller",
            header: "Seller",
            render: (row) => row.seller?.name || "—",
          },
          { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
          {
            key: "last",
            header: "Last Login",
            render: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "—"),
          },
          {
            key: "created",
            header: "Created",
            render: (row) => formatDateTime(row.createdAt),
          },
        ]}
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
          Previous
        </Button>
        <span className="text-sm text-slate-500">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
          Next
        </Button>
      </div>
      <CreateManagerDrawer open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void load()} />
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  labels,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  labels?: Record<string, string>;
}) {
  return (
    <select
      className="h-9 rounded-md border bg-white px-2 text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option || "all"} value={option}>
          {option ? labels?.[option] ?? option : placeholder}
        </option>
      ))}
    </select>
  );
}
