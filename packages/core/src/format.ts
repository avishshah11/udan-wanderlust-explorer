// Short human descriptions of a trip, shared by emails, the account, the desk
// and Claude tool responses.

import { CABIN_CLASS_LABELS, HOTEL_TIER_LABELS, type CabinClass, type HotelTier, type RequestType } from "./domain";

export function travelWhen(input: { start_date?: string | null; travel_month?: string | null }): string {
  if (input.start_date) {
    return new Date(`${input.start_date}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (input.travel_month) {
    const ym = input.travel_month.slice(0, 7);
    return new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  return "dates to be confirmed";
}

export function partyText(adults: number, children = 0): string {
  const a = `${adults} adult${adults === 1 ? "" : "s"}`;
  return children > 0 ? `${a}, ${children} child${children === 1 ? "" : "ren"}` : a;
}

const nightsText = (n: number) => `${n} night${n === 1 ? "" : "s"}`;

/**
 * One line describing the request, by type:
 *   package  "Bali, 5 nights, 2 adults, 4-star, from 10 May 2027"
 *   flights  "Flights from Vadodara to Dubai, return, 2 adults, economy, 10 May 2027 to 17 May 2027"
 *   hotels   "Hotel in Goa, 3 nights, 1 room, 2 adults, 4-star, 10 May 2027 to 13 May 2027"
 */
export function tripSummary(r: {
  request_type?: RequestType | null;
  destination: string;
  origin_city?: string | null;
  nights?: number | null;
  adults: number;
  children?: number | null;
  rooms?: number | null;
  hotel_tier?: HotelTier | null;
  cabin_class?: CabinClass | null;
  start_date?: string | null;
  end_date?: string | null;
  travel_month?: string | null;
}): string {
  const party = partyText(r.adults, r.children ?? 0);
  const dates = r.start_date && r.end_date ? `${travelWhen({ start_date: r.start_date })} to ${travelWhen({ start_date: r.end_date })}` : null;

  if (r.request_type === "flights") {
    const parts = [`Flights from ${r.origin_city ?? "?"} to ${r.destination}`, r.end_date ? "return" : "one way", party];
    if (r.cabin_class) parts.push(CABIN_CLASS_LABELS[r.cabin_class].toLowerCase());
    parts.push(dates ?? travelWhen(r));
    return parts.join(", ");
  }

  if (r.request_type === "hotels") {
    const parts = [`Hotel in ${r.destination}`];
    if (r.nights) parts.push(nightsText(r.nights));
    if (r.rooms) parts.push(`${r.rooms} room${r.rooms === 1 ? "" : "s"}`);
    parts.push(party);
    if (r.hotel_tier) parts.push(HOTEL_TIER_LABELS[r.hotel_tier]);
    parts.push(dates ?? travelWhen(r));
    return parts.join(", ");
  }

  const parts = [r.destination];
  if (r.nights) parts.push(nightsText(r.nights));
  parts.push(party);
  if (r.hotel_tier) parts.push(HOTEL_TIER_LABELS[r.hotel_tier]);
  parts.push(r.start_date ? `from ${travelWhen(r)}` : travelWhen(r));
  return parts.join(", ");
}
