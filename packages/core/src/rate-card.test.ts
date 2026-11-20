import { describe, expect, it } from "vitest";
import { type RateBand, bandBasis, bandFromRow, describeBand, nightsGroup, partyRange, pickBand } from "./rate-card";

const band = (over: Partial<RateBand>): RateBand => ({
  destinationSlug: "bali",
  month: null,
  hotelTier: "4_star",
  nightsGroup: "5-6",
  lowPerAdult: 30000,
  highPerAdult: 34000,
  sampleCount: 8,
  ...over,
});

describe("nightsGroup", () => {
  it("groups like the database", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9, 10, 90].map(nightsGroup)).toEqual(["1-2", "1-2", "3-4", "3-4", "5-6", "5-6", "7-9", "7-9", "10+", "10+"]);
  });
});

describe("pickBand", () => {
  const bands = [
    band({}),
    band({ month: 3, sampleCount: 5, lowPerAdult: 36000, highPerAdult: 40000 }),
    band({ month: 4, sampleCount: 4 }),
    band({ hotelTier: "3_star", sampleCount: 20 }),
    band({ nightsGroup: "3-4", sampleCount: 30 }),
    band({ destinationSlug: "goa", sampleCount: 40 }),
  ];

  it("prefers the travel month's own band", () => {
    expect(pickBand(bands, { destinationSlug: "bali", nights: 5, month: 3, tier: "4_star" })?.month).toBe(3);
  });

  it("falls back to all months when the month has fewer than 5 quotes", () => {
    const b = pickBand(bands, { destinationSlug: "bali", nights: 6, month: 4, tier: "4_star" });
    expect(b?.month).toBeNull();
    expect(b?.sampleCount).toBe(8);
  });

  it("keeps to the asked-for hotel category", () => {
    expect(pickBand(bands, { destinationSlug: "bali", nights: 5, tier: "5_star" })).toBeNull();
    expect(pickBand(bands, { destinationSlug: "bali", nights: 5, tier: "3_star" })?.sampleCount).toBe(20);
  });

  it("without a category, takes the one with the most quotes", () => {
    expect(pickBand(bands, { destinationSlug: "bali", nights: 5 })?.hotelTier).toBe("3_star");
  });

  it("never returns a band under 5 quotes, another destination or another nights group", () => {
    expect(pickBand([band({ sampleCount: 4 })], { destinationSlug: "bali", nights: 5 })).toBeNull();
    expect(pickBand(bands, { destinationSlug: "bali", nights: 10 })).toBeNull();
    expect(pickBand(bands, { destinationSlug: "kerala", nights: 5 })).toBeNull();
  });
});

describe("wording", () => {
  it("multiplies per-adult prices by the adults", () => {
    expect(partyRange(band({}), 3)).toEqual({ low: 90000, high: 102000 });
  });

  it("says what the band covers", () => {
    expect(describeBand(band({}))).toBe("4-star, 5 to 6 nights, any month");
    expect(describeBand(band({ month: 12, nightsGroup: "10+" }))).toBe("4-star, 10 nights or more, in December");
    expect(bandBasis(band({}), 2, 1)).toBe(
      "From 8 past Udan quotes for 4-star, 5 to 6 nights, any month. Per adult on twin sharing (shown for 2 adults; children are priced in the quote); covers hotel, transfers, sightseeing and meals as quoted; flights, visa and insurance are priced separately.",
    );
  });

  it("reads numeric strings from the Data API", () => {
    expect(
      bandFromRow({ destination_slug: "goa", month: null, hotel_tier: "3_star", nights_group: "3-4", price_low: "12000.00", price_high: "15000.00", sample_count: 6 }),
    ).toMatchObject({ lowPerAdult: 12000, highPerAdult: 15000 });
  });
});
