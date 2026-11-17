// Short human descriptions of a trip, shared by emails, the account, the desk
// and Claude tool responses.

import { HOTEL_TIER_LABELS, type HotelTier } from "./domain";

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

/** "Bali, 5 nights, 2 adults, 4-star, from 10 May 2027" */
export function tripSummary(r: {
  destination: string;
  nights: number;
  adults: number;
  children?: number | null;
  hotel_tier?: HotelTier | null;
  start_date?: string | null;
  travel_month?: string | null;
}): string {
  const parts = [r.destination, `${r.nights} night${r.nights === 1 ? "" : "s"}`, partyText(r.adults, r.children ?? 0)];
  if (r.hotel_tier) parts.push(HOTEL_TIER_LABELS[r.hotel_tier]);
  parts.push(r.start_date ? `from ${travelWhen(r)}` : travelWhen(r));
  return parts.join(", ");
}
