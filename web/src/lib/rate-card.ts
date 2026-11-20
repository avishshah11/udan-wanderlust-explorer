// Rate-card bands and display exchange rates, read once per build from the
// Udan database's public API (the same anonymous access the website form
// has). Row level security returns only bands with 5+ samples (rule 2).
//
// Without PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY the site
// builds with no prices, as before. With them, a failed read fails the build,
// so a deploy never silently drops prices that were live.

import { type FxRate, formatInr } from "@udan/core/currency";
import { HOTEL_TIER_LABELS, HOTEL_TIERS } from "@udan/core/domain";
import { NIGHTS_GROUPS, RATE_CARD_COLUMNS, type RateBand, type RateCardRow, bandFromRow, isPublicBand, nightsGroupLabel } from "@udan/core/rate-card";

export interface RateCardData {
  bands: RateBand[];
  rates: FxRate[];
}

let cached: Promise<RateCardData> | null = null;

async function read<T>(base: string, key: string, path: string): Promise<T> {
  const res = await fetch(`${base}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Rate card: GET ${path} answered ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export function loadRateCard(): Promise<RateCardData> {
  cached ??= (async () => {
    const base = (import.meta.env.PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
    if (!base || !key) {
      console.warn("[rate-card] PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY not set: building without price ranges.");
      return { bands: [], rates: [] };
    }
    const [rows, fx] = await Promise.all([
      read<RateCardRow[]>(base, key, `rate_card?select=${encodeURIComponent(RATE_CARD_COLUMNS.replace(/\s/g, ""))}&sample_count=gte.5`),
      read<{ currency: string; inr_per_unit: number; rate_date: string }[]>(base, key, "fx_latest?select=currency,inr_per_unit,rate_date"),
    ]);
    return {
      bands: rows.map(bandFromRow).filter(isPublicBand),
      rates: fx.map((r) => ({ currency: r.currency, inrPerUnit: Number(r.inr_per_unit), rateDate: r.rate_date })),
    };
  })();
  return cached;
}

/** Public bands for one destination: all-months bands first, by hotel category and nights. */
export function bandsFor(data: RateCardData, slug: string) {
  const own = data.bands.filter((b) => b.destinationSlug === slug);
  const order = (b: RateBand) => `${HOTEL_TIERS.indexOf(b.hotelTier)}|${NIGHTS_GROUPS.indexOf(b.nightsGroup)}|${String(b.month ?? 0).padStart(2, "0")}`;
  return {
    anyMonth: own.filter((b) => b.month === null).sort((a, b) => order(a).localeCompare(order(b))),
    byMonth: own.filter((b) => b.month !== null).sort((a, b) => (a.month! - b.month!) || order(a).localeCompare(order(b))),
  };
}

/** One line for a destination card, or null when the destination has no public band. */
export function cardPrice(data: RateCardData, slug: string): { text: string; detail: string } | null {
  const b = headlineBand(data, slug);
  if (!b) return null;
  return {
    text: `Typical ${formatInr(b.lowPerAdult)} to ${formatInr(b.highPerAdult)} per adult`,
    detail: `${HOTEL_TIER_LABELS[b.hotelTier]}, ${nightsGroupLabel(b.nightsGroup)}, from ${b.sampleCount} past quotes`,
  };
}

/** The headline band for a destination card: the all-months band with the most quotes. */
export function headlineBand(data: RateCardData, slug: string): RateBand | null {
  return bandsFor(data, slug).anyMonth.sort((a, b) => b.sampleCount - a.sampleCount)[0] ?? null;
}
