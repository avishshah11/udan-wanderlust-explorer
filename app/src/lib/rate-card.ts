import "server-only";
import {
  type Database,
  type HotelTier,
  RATE_CARD_COLUMNS,
  type RequestType,
  bandBasis,
  bandFromRow,
  formatInr,
  nightsGroup,
  partyRange,
  pickBand,
} from "@udan/core";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface TypicalPrice {
  low: number;
  high: number;
  sampleCount: number;
  /** What the range is based on and covers. */
  basis: string;
}

/**
 * The public rate-card band for a holiday-package request, for the party, or
 * null. Flights-only and hotel-only requests have no band.
 */
export async function typicalPriceFor(
  db: SupabaseClient<Database>,
  r: {
    request_type: RequestType;
    destination_slug: string | null;
    nights: number | null;
    travel_month: string | null;
    hotel_tier: HotelTier | null;
    adults: number;
    children: number;
  },
): Promise<TypicalPrice | null> {
  if (r.request_type !== "package" || !r.destination_slug || !r.nights) return null;
  const { data } = await db
    .from("rate_card")
    .select(RATE_CARD_COLUMNS)
    .eq("destination_slug", r.destination_slug)
    .eq("nights_group", nightsGroup(r.nights))
    .gte("sample_count", 5);
  const band = pickBand((data ?? []).map(bandFromRow), {
    destinationSlug: r.destination_slug,
    nights: r.nights,
    month: r.travel_month ? Number(r.travel_month.slice(5, 7)) : null,
    tier: r.hotel_tier,
  });
  if (!band) return null;
  return { ...partyRange(band, r.adults), sampleCount: band.sampleCount, basis: bandBasis(band, r.adults, r.children) };
}

export const formatTypical = (t: TypicalPrice) => ({ low: formatInr(t.low), high: formatInr(t.high), basis: t.basis });
