import { LINE_TYPES, type LineType } from "@udan/core";

const ALIASES: Record<string, LineType> = { flights: "flight", hotels: "hotel", transfers: "transfer", activities: "activity", tour: "activity", sightseeing: "activity" };

/**
 * Turn a free-text itinerary ("hotel: Ubud, 3 nights" per line) into
 * requested_items. Lines without a known type prefix become "other".
 */
export function parseItineraryText(text: string): { type: LineType; description: string }[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2)
    .slice(0, 30)
    .map((line) => {
      const m = /^([a-z]+)\s*:\s*(.+)$/i.exec(line);
      const key = m?.[1]?.toLowerCase();
      const type = key ? ((LINE_TYPES as readonly string[]).includes(key) ? (key as LineType) : ALIASES[key]) : undefined;
      return type && m?.[2] ? { type, description: m[2].trim().slice(0, 300) } : { type: "other" as LineType, description: line.slice(0, 300) };
    });
}

const numberOrUndefined = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/[,\s₹]/g, "");
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : s; // let the schema report non-numbers
};

const stringOrUndefined = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? undefined : s;
};

/** FormData from the request form (or the website form) to quoteRequestSchema input. */
export function formDataToRequestInput(fd: FormData): Record<string, unknown> {
  const childAges = String(fd.get("child_ages") ?? "")
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  const ota = stringOrUndefined(fd.get("ota_name")) || stringOrUndefined(fd.get("ota_price"))
    ? {
        ota_name: stringOrUndefined(fd.get("ota_name")) ?? "",
        product_name: stringOrUndefined(fd.get("ota_product")) ?? "",
        room_type: stringOrUndefined(fd.get("ota_room")),
        price: numberOrUndefined(fd.get("ota_price")),
        currency: stringOrUndefined(fd.get("ota_currency")) ?? "INR",
      }
    : undefined;
  return {
    destination: stringOrUndefined(fd.get("destination")) ?? "",
    destination_slug: stringOrUndefined(fd.get("destination_slug")),
    origin_city: stringOrUndefined(fd.get("origin_city")),
    start_date: stringOrUndefined(fd.get("start_date")),
    travel_month: stringOrUndefined(fd.get("travel_month")),
    nights: numberOrUndefined(fd.get("nights")),
    adults: numberOrUndefined(fd.get("adults")),
    children: numberOrUndefined(fd.get("children")),
    child_ages: childAges.length > 0 ? childAges : undefined,
    hotel_tier: stringOrUndefined(fd.get("hotel_tier")),
    budget_min: numberOrUndefined(fd.get("budget_min")),
    budget_max: numberOrUndefined(fd.get("budget_max")),
    budget_currency: stringOrUndefined(fd.get("budget_currency")),
    flexibility: stringOrUndefined(fd.get("flexibility")),
    inclusions_wanted: fd.getAll("inclusions_wanted").map(String),
    requested_items: parseItineraryText(String(fd.get("itinerary") ?? "")),
    ota_comparison: ota,
    customer_notes: stringOrUndefined(fd.get("customer_notes")),
    preferred_currency: stringOrUndefined(fd.get("preferred_currency")),
    time_zone: stringOrUndefined(fd.get("time_zone")),
    country: stringOrUndefined(fd.get("country")),
  };
}
