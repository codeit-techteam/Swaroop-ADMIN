/** Canonical trading unit on offers is ₹/MT. Grade Delhi list is ₹/kg. */
export type PriceUnit = "MT" | "KG";

export const KG_PER_MT = 1000;

export function mtFromKg(pricePerKg: number): number {
  return pricePerKg * KG_PER_MT;
}

export function kgFromMt(pricePerMt: number): number {
  return pricePerMt / KG_PER_MT;
}

export function parsePriceInput(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function formatInr(value: number, fractionDigits = 2): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Normalize UI input into stored ₹/MT for Offer.basePrice. */
export function toPricePerMt(amount: number, unit: PriceUnit): number {
  return unit === "KG" ? mtFromKg(amount) : amount;
}

/** Normalize UI input into stored ₹/kg for Grade Delhi/producer prices. */
export function toPricePerKg(amount: number, unit: PriceUnit): number {
  return unit === "MT" ? kgFromMt(amount) : amount;
}
