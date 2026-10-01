"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  errorMessage,
  IMPORT_BASE,
  ImportTradingTabs,
  importLabel,
  Section,
  useLoader,
} from "@/components/import-trading/shared";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState, TableSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getImportSettings, type ImportSettings, updateImportSettings } from "@/lib/api/import-trading";
import { formatDateTime } from "@/lib/format";

export default function ImportSettingsPage() {
  const { data, error, loading, reload, setData } = useLoader(getImportSettings, []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import settings"
        description="Matching weights and trading policy. Every change is recorded in the audit log."
        breadcrumbs={[{ label: "Import Trading", href: IMPORT_BASE }, { label: "Settings" }]}
      />
      <ImportTradingTabs />
      {loading && !data ? (
        <TableSkeleton />
      ) : error || !data ? (
        <ErrorState title="Unable to load Import settings." description={error ?? undefined} onRetry={reload} />
      ) : (
        <SettingsForm key={data.updatedAt ?? "initial"} settings={data} onSaved={setData} />
      )}
    </div>
  );
}

const INT = /^\d{1,4}$/;

function SettingsForm({ settings, onSaved }: { settings: ImportSettings; onSaved: (s: ImportSettings) => void }) {
  const [weights, setWeights] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.criteria.map((c) => [c, String(settings.matchWeights[c] ?? 0)])),
  );
  const [minScore, setMinScore] = useState(String(settings.minMatchScore));
  const [nearExpiry, setNearExpiry] = useState(String(settings.nearExpiryHours));
  const [ttl, setTtl] = useState(String(settings.negotiationTtlHours));
  const [allowCustomGrade, setAllowCustomGrade] = useState(settings.allowCustomGrade);
  const [saving, setSaving] = useState(false);

  const total = Object.values(weights).reduce((sum, v) => sum + (INT.test(v) ? Number(v) : 0), 0);
  const invalid: string[] = [
    ...Object.entries(weights)
      .filter(([, v]) => !INT.test(v) || Number(v) > 1000)
      .map(([k]) => `${importLabel(k)} weight`),
    ...(total === 0 ? ["At least one weight must be above 0"] : []),
    ...(!INT.test(minScore) || Number(minScore) > 100 ? ["Minimum score (0–100)"] : []),
    ...(!INT.test(nearExpiry) || Number(nearExpiry) > 720 ? ["Near-expiry window (0–720 hours)"] : []),
    ...(!INT.test(ttl) || Number(ttl) < 1 || Number(ttl) > 2160 ? ["Negotiation expiry (1–2160 hours)"] : []),
  ];

  const save = async () => {
    setSaving(true);
    try {
      const next = await updateImportSettings({
        matchWeights: Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Number(v)])),
        minMatchScore: Number(minScore),
        nearExpiryHours: Number(nearExpiry),
        negotiationTtlHours: Number(ttl),
        allowCustomGrade,
      });
      toast.success("Import settings saved. New matches use the updated weights.");
      onSaved(next);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const numberInput = (value: string, onChange: (v: string) => void, id: string) => (
    <Input
      id={id}
      inputMode="numeric"
      className="w-28"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
    />
  );

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Section title="Match weights" className="xl:col-span-2">
        <p className="mb-3 text-xs text-muted-foreground">
          Each criterion contributes its share of the total weight to a 0–100 score. Weights are normalised
          to 100 when saved. Prices are compared only when currency, Incoterm and price-basis location are the same.
        </p>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {settings.criteria.map((c) => {
            const v = weights[c] ?? "0";
            const share = total && INT.test(v) ? Math.round((Number(v) / total) * 1000) / 10 : 0;
            return (
              <div key={c} className="flex items-center justify-between gap-3">
                <Label htmlFor={`w-${c}`} className="text-sm">
                  {importLabel(c)}
                </Label>
                <div className="flex items-center gap-2">
                  {numberInput(v, (next) => setWeights((w) => ({ ...w, [c]: next })), `w-${c}`)}
                  <span className="w-12 text-right text-xs text-muted-foreground">{share}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
      <div className="flex flex-col gap-4">
        <Section title="Policy">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="s-min">Minimum match score</Label>
              {numberInput(minScore, setMinScore, "s-min")}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="s-near">Near-expiry alert (hours)</Label>
              {numberInput(nearExpiry, setNearExpiry, "s-near")}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="s-ttl">Offer expiry (hours)</Label>
              {numberInput(ttl, setTtl, "s-ttl")}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="s-custom">Allow custom grade names</Label>
              <Switch id="s-custom" checked={allowCustomGrade} onCheckedChange={setAllowCustomGrade} />
            </div>
            <div className="text-xs text-muted-foreground">
              Notification channels: {settings.notificationChannels.map(importLabel).join(", ") || "—"}
            </div>
          </div>
        </Section>
        {invalid.length ? (
          <ul className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {invalid.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : null}
        <Button disabled={saving || invalid.length > 0} onClick={() => void save()}>
          Save settings
        </Button>
        {settings.updatedAt ? (
          <p className="text-xs text-muted-foreground">Last updated {formatDateTime(settings.updatedAt)}</p>
        ) : null}
      </div>
    </div>
  );
}
