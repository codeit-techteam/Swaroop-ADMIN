"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatInr,
  kgFromMt,
  mtFromKg,
  parsePriceInput,
  type PriceUnit,
} from "@/lib/price-units";
import { cn } from "@/lib/utils";

interface PriceUnitFieldProps {
  id: string;
  label: string;
  value: string;
  unit: PriceUnit;
  onValueChange: (value: string) => void;
  onUnitChange: (unit: PriceUnit) => void;
  /** Which unit the backend stores — used for the conversion hint. */
  storageUnit: PriceUnit;
  hint?: string;
  error?: string | null;
  disabled?: boolean;
  className?: string;
}

export function PriceUnitField({
  id,
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  storageUnit,
  hint,
  error,
  disabled,
  className,
}: PriceUnitFieldProps) {
  const amount = parsePriceInput(value);
  const asMt = amount == null ? null : unit === "MT" ? amount : mtFromKg(amount);
  const asKg = amount == null ? null : unit === "KG" ? amount : kgFromMt(amount);
  const stored =
    amount == null
      ? null
      : storageUnit === "MT"
        ? asMt
        : asKg;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₹
          </span>
          <Input
            id={id}
            inputMode="decimal"
            value={value}
            disabled={disabled}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={unit === "MT" ? "98000" : "98"}
            className="pl-7"
          />
        </div>
        <Select
          value={unit}
          disabled={disabled}
          onValueChange={(next) => onUnitChange(next as PriceUnit)}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MT">per MT</SelectItem>
            <SelectItem value="KG">per kg</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {amount != null ? (
        <p className="text-[11px] text-muted-foreground">
          = ₹{formatInr(asMt!)} / MT · ₹{formatInr(asKg!, 4)} / kg
          {stored != null ? (
            <>
              {" "}
              · saves as ₹{formatInr(stored, storageUnit === "KG" ? 4 : 2)} /{" "}
              {storageUnit === "MT" ? "MT" : "kg"}
            </>
          ) : null}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
