"use client";

import { useState } from "react";
import { toast } from "sonner";

import { CreditPager, CreditTable, CreditToolbar } from "@/components/credit/credit-table";
import {
  errorMessage,
  type FieldErrors,
  fieldErrorsOf,
  IMPORT_BASE,
  ImportBadge,
  ImportTradingTabs,
  importLabel,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createImportMaster,
  listImportMaster,
  MASTER_ENTITIES,
  type MasterEntity,
  type MasterInput,
  type MasterRecord,
  setImportMasterActive,
  updateImportMaster,
} from "@/lib/api/import-trading";

type FieldKey = keyof MasterInput;

const ENTITY: Record<MasterEntity, { label: string; fields: FieldKey[]; codeHint?: string }> = {
  currencies: {
    label: "Currencies",
    fields: ["code", "name", "symbol", "decimalPlaces", "importEnabled", "sortOrder"],
    codeHint: "ISO 4217, e.g. USD",
  },
  incoterms: { label: "Incoterms", fields: ["code", "name", "description", "priceBasis", "sortOrder"] },
  ports: {
    label: "Ports",
    fields: ["code", "name", "countryId", "type", "sortOrder"],
    codeHint: "UN/LOCODE, e.g. INMUN",
  },
  brands: { label: "Brands", fields: ["code", "name", "countryId", "sortOrder"] },
  packaging: { label: "Packaging", fields: ["code", "name", "sortOrder"] },
  "document-requirements": {
    label: "Document requirements",
    fields: ["code", "name", "description", "documentCategory", "sortOrder"],
  },
  countries: { label: "Countries", fields: ["code", "name"], codeHint: "ISO 3166-1 alpha-2, e.g. IN" },
};

const FIELD_LABEL: Record<FieldKey, string> = {
  code: "Code",
  name: "Name",
  description: "Description",
  symbol: "Symbol",
  decimalPlaces: "Decimal places",
  importEnabled: "Available for Import",
  priceBasis: "Price basis",
  countryId: "Country",
  type: "Port type",
  documentCategory: "Document category",
  sortOrder: "Sort order",
};

const PRICE_BASIS = ["ORIGIN", "DESTINATION", "ANY"];
const PORT_TYPES = ["SEA", "AIR", "OTHER"];
const DOCUMENT_CATEGORIES = [
  "COA",
  "TDS",
  "SDS",
  "MSDS",
  "CERTIFICATE_OF_ORIGIN",
  "COMMERCIAL_INVOICE",
  "PACKING_LIST",
  "BILL_OF_LADING",
  "INSPECTION_CERTIFICATE",
  "INSURANCE_CERTIFICATE",
  "QUALITY_CERTIFICATE",
  "TEST_CERTIFICATE",
  "COMPLIANCE_CERTIFICATE",
  "TECHNICAL_SPECIFICATION",
  "PRODUCT_SPECIFICATION",
  "PROFORMA",
  "OTHER",
];

export default function ImportMasterDataPage() {
  const [entity, setEntity] = useState<MasterEntity>("currencies");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MasterRecord | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoader(
    () => listImportMaster(entity, { search, status: status || undefined, page, limit: 50 }),
    [entity, search, status, page],
  );
  const cfg = ENTITY[entity];

  const toggle = async (row: MasterRecord) => {
    setBusyId(row.id);
    try {
      await setImportMasterActive(entity, row.id, row.status !== "ACTIVE");
      toast.success(`${row.code} ${row.status === "ACTIVE" ? "disabled" : "enabled"}`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import master data"
        description="Values offered in Import forms. Disabling hides a value from new listings; published listings keep the name captured at publish."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Master data" }]}
        actions={<Button size="sm" onClick={() => setEditing("new")}>Add {cfg.label.toLowerCase().replace(/s$/, "")}</Button>}
      />
      <ImportTradingTabs />
      <div className="flex flex-wrap gap-1">
        {MASTER_ENTITIES.map((e) => (
          <Button
            key={e}
            size="sm"
            variant={e === entity ? "default" : "outline"}
            onClick={() => {
              setEntity(e);
              setPage(1);
              setSearch("");
            }}
          >
            {ENTITY[e].label}
          </Button>
        ))}
      </div>
      <CreditToolbar
        search={search}
        onSearch={(value) => {
          setPage(1);
          setSearch(value);
        }}
        searchPlaceholder="Search code or name"
        status={status}
        statuses={[
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Disabled" },
        ]}
        onStatus={(value) => {
          setPage(1);
          setStatus(value);
        }}
      />
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState title={`Unable to load ${cfg.label.toLowerCase()}.`} description={error} onRetry={reload} />
      ) : (
        <>
          <CreditTable
            rows={data?.items ?? []}
            getRowId={(row) => row.id}
            emptyTitle={`No ${cfg.label.toLowerCase()} found.`}
            emptyDescription="Add one, or run the Import master-data seed."
            columns={[
              { key: "code", header: "Code", accessor: (r) => r.code },
              { key: "name", header: "Name", accessor: (r) => r.name },
              ...(entity === "incoterms"
                ? [{ key: "basis", header: "Price basis", accessor: (r: MasterRecord) => importLabel(r.priceBasis) }]
                : []),
              ...(entity === "ports" || entity === "brands"
                ? [{ key: "country", header: "Country", accessor: (r: MasterRecord) => r.country?.name ?? r.countryCode ?? "—" }]
                : []),
              ...(entity === "currencies"
                ? [
                    {
                      key: "import",
                      header: "Import",
                      accessor: (r: MasterRecord) => (r.importEnabled ? "Enabled" : "Off"),
                    },
                  ]
                : []),
              ...(entity === "document-requirements"
                ? [{ key: "cat", header: "Category", accessor: (r: MasterRecord) => importLabel(r.documentCategory) }]
                : []),
              { key: "status", header: "Status", render: (r) => <ImportBadge value={r.status} /> },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={r.status === "ACTIVE" ? "outline" : "default"}
                      disabled={busyId === r.id}
                      onClick={() => void toggle(r)}
                    >
                      {r.status === "ACTIVE" ? "Disable" : "Enable"}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <CreditPager meta={data?.meta} onPage={setPage} />
        </>
      )}

      {editing ? (
        <MasterDialog
          key={editing === "new" ? `new-${entity}` : editing.id}
          entity={entity}
          record={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}

function MasterDialog({
  entity,
  record,
  onClose,
  onSaved,
}: {
  entity: MasterEntity;
  record: MasterRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const cfg = ENTITY[entity];
  const [form, setForm] = useState<MasterInput>(() =>
    Object.fromEntries(cfg.fields.map((f) => [f, record?.[f] ?? undefined])),
  );
  const [countryLabel, setCountryLabel] = useState(record?.country ? `${record.country.name} (${record.country.code})` : "");
  const [countrySearch, setCountrySearch] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const countries = useLoader(
    () =>
      cfg.fields.includes("countryId")
        ? listImportMaster("countries", { search: countrySearch, status: "ACTIVE", limit: 20 })
        : Promise.resolve({ items: [] as MasterRecord[] }),
    [countrySearch, entity],
  );

  const set = <K extends FieldKey>(key: K, value: MasterInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const save = async () => {
    const payload: MasterInput = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== undefined && v !== ""),
    );
    setSaving(true);
    try {
      if (record) await updateImportMaster(entity, record.id, payload);
      else await createImportMaster(entity, payload);
      toast.success(`${payload.code ?? record?.code ?? "Record"} saved`);
      onSaved();
    } catch (err) {
      setErrors(fieldErrorsOf(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (key: FieldKey) => {
    const id = `m-${key}`;
    const error = errors[key];
    let control: React.ReactNode;
    if (key === "importEnabled") {
      control = <Switch id={id} checked={Boolean(form.importEnabled)} onCheckedChange={(v) => set("importEnabled", v)} />;
    } else if (key === "description") {
      control = (
        <Textarea id={id} rows={2} maxLength={2000} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      );
    } else if (key === "priceBasis" || key === "type" || key === "documentCategory") {
      const options = key === "priceBasis" ? PRICE_BASIS : key === "type" ? PORT_TYPES : DOCUMENT_CATEGORIES;
      control = (
        <select
          id={id}
          className="h-9 w-full rounded-md border bg-white px-2 text-sm"
          value={(form[key] as string | undefined) ?? ""}
          onChange={(e) => set(key, (e.target.value || undefined) as MasterInput[typeof key])}
        >
          <option value="">Select</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {importLabel(o)}
            </option>
          ))}
        </select>
      );
    } else if (key === "countryId") {
      control = (
        <div className="space-y-1.5">
          <Input
            id={id}
            placeholder={countryLabel || "Search country"}
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
          />
          <select
            className="h-9 w-full rounded-md border bg-white px-2 text-sm"
            value={form.countryId ?? ""}
            onChange={(e) => {
              const c = countries.data?.items.find((x) => x.id === e.target.value);
              set("countryId", e.target.value || undefined);
              setCountryLabel(c ? `${c.name} (${c.code})` : "");
            }}
          >
            <option value="">{countryLabel || "Select country"}</option>
            {(countries.data?.items ?? [])
              .filter((c) => c.id !== form.countryId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            {form.countryId ? <option value={form.countryId}>{countryLabel}</option> : null}
          </select>
        </div>
      );
    } else if (key === "decimalPlaces" || key === "sortOrder") {
      control = (
        <Input
          id={id}
          inputMode="numeric"
          value={form[key] ?? ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, "");
            set(key, raw === "" ? undefined : Number(raw));
          }}
        />
      );
    } else {
      control = (
        <Input
          id={id}
          value={(form[key] as string | undefined) ?? ""}
          onChange={(e) => set(key, (key === "code" ? e.target.value.toUpperCase() : e.target.value) as MasterInput[typeof key])}
        />
      );
    }
    return (
      <div key={key} className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {FIELD_LABEL[key]}
        </Label>
        {control}
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : key === "code" && cfg.codeHint ? (
          <p className="text-xs text-muted-foreground">{cfg.codeHint}</p>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? `Edit ${record.code}` : `Add to ${cfg.label.toLowerCase()}`}</DialogTitle>
          <DialogDescription>
            Changes are audited. Published listings keep the values captured when they were published.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">{cfg.fields.map(field)}</div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
