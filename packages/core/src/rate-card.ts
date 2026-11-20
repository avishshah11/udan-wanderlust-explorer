// The rate card: typical price ranges from Udan's own past quotes, built in
// Postgres (supabase/migrations/20261120000100_rate_card.sql). This module
// picks the band to show and says what it covers, the same way on the
// website, in Claude and on the desk.
//
// Owner's decisions (20 Nov 2026): priced per adult on twin sharing; land only
// (flights, visa and insurance are priced in the firm quote); nights grouped
// 1-2 / 3-4 / 5-6 / 7-9 / 10+; the most specific band with 5+ samples wins.

import type { Database } from "./database.types";
import { HOTEL_TIER_LABELS, HOTEL_TIERS, type HotelTier } from "./domain";

type Enums = Database["public"]["Enums"];
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const NIGHTS_GROUPS = ["1-2", "3-4", "5-6", "7-9", "10+"] as const;
export type NightsGroup = (typeof NIGHTS_GROUPS)[number];
true satisfies Same<NightsGroup, Enums["nights_group"]>;

/** Rule 2: a band backed by fewer quotes than this is never shown. */
export const MIN_BAND_SAMPLES = 5;

/** What every band covers, in the words customers see. */
export const BAND_COVERS = "hotel, transfers, sightseeing and meals as quoted";
export const BAND_EXCLUDES = "flights, visa and insurance";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Same grouping as public.nights_group() in Postgres. */
export function nightsGroup(nights: number): NightsGroup {
  if (nights <= 2) return "1-2";
  if (nights <= 4) return "3-4";
  if (nights <= 6) return "5-6";
  if (nights <= 9) return "7-9";
  return "10+";
}

export function nightsGroupLabel(group: NightsGroup): string {
  return group === "10+" ? "10 nights or more" : `${group.replace("-", " to ")} nights`;
}

export interface RateBand {
  destinationSlug: string;
  /** 1-12, or null for the band across all months. */
  month: number | null;
  hotelTier: HotelTier;
  nightsGroup: NightsGroup;
  lowPerAdult: number;
  highPerAdult: number;
  sampleCount: number;
}

/** A rate_card row as the Data API returns it (numerics may arrive as strings). */
export interface RateCardRow {
  destination_slug: string;
  month: number | null;
  hotel_tier: HotelTier;
  nights_group: NightsGroup;
  price_low: number | string;
  price_high: number | string;
  sample_count: number;
}

export const RATE_CARD_COLUMNS = "destination_slug, month, hotel_tier, nights_group, price_low, price_high, sample_count";

export function bandFromRow(row: RateCardRow): RateBand {
  return {
    destinationSlug: row.destination_slug,
    month: row.month,
    hotelTier: row.hotel_tier,
    nightsGroup: row.nights_group,
    lowPerAdult: Number(row.price_low),
    highPerAdult: Number(row.price_high),
    sampleCount: row.sample_count,
  };
}

export function isPublicBand(band: Pick<RateBand, "sampleCount">): boolean {
  return band.sampleCount >= MIN_BAND_SAMPLES;
}

/**
 * The band to show for a trip: same destination and nights group, 5+ samples;
 * the travel month's own band before the all-months band; the asked-for hotel
 * category only, or, when none was given, the category with the most quotes.
 */
export function pickBand(
  bands: readonly RateBand[],
  trip: { destinationSlug: string; nights: number; month?: number | null; tier?: HotelTier | null },
): RateBand | null {
  const group = nightsGroup(trip.nights);
  const candidates = bands.filter(
    (b) =>
      isPublicBand(b) &&
      b.destinationSlug === trip.destinationSlug &&
      b.nightsGroup === group &&
      (trip.tier ? b.hotelTier === trip.tier : true) &&
      (b.month === null || (trip.month != null && b.month === trip.month)),
  );
  const score = (b: RateBand) => (b.month !== null ? 1_000_000 : 0) + b.sampleCount;
  return candidates.sort((a, b) => score(b) - score(a) || HOTEL_TIERS.indexOf(a.hotelTier) - HOTEL_TIERS.indexOf(b.hotelTier))[0] ?? null;
}

/** The band for a party: per-adult prices times the adults. */
export function partyRange(band: RateBand, adults: number): { low: number; high: number } {
  return { low: band.lowPerAdult * adults, high: band.highPerAdult * adults };
}

/** "4-star, 5 to 6 nights, any month" or "4-star, 5 to 6 nights, in March". */
export function describeBand(band: RateBand): string {
  const when = band.month === null ? "any month" : `in ${MONTHS[band.month - 1]}`;
  return `${HOTEL_TIER_LABELS[band.hotelTier]}, ${nightsGroupLabel(band.nightsGroup)}, ${when}`;
}

/**
 * One sentence on what a band is based on, for Claude and the desk:
 * "From 12 past Udan quotes for 4-star, 5 to 6 nights, any month. Per adult on
 * twin sharing (shown for 2 adults); covers hotel, transfers, sightseeing and
 * meals as quoted; flights, visa and insurance are priced separately."
 */
export function bandBasis(band: RateBand, adults?: number, children = 0): string {
  const party = adults ? ` (shown for ${adults} adult${adults === 1 ? "" : "s"}${children > 0 ? "; children are priced in the quote" : ""})` : "";
  return `From ${band.sampleCount} past Udan quotes for ${describeBand(band)}. Per adult on twin sharing${party}; covers ${BAND_COVERS}; ${BAND_EXCLUDES} are priced separately.`;
}
