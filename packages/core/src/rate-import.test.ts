import { describe, expect, it } from "vitest";
import { parseCsv, parseRateSamples } from "./rate-import";

const destinations = [
  { slug: "bali", name: "Bali" },
  { slug: "goa", name: "Goa" },
];

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });
});

describe("parseRateSamples", () => {
  it("reads the documented columns in any order and spelling", () => {
    const csv = [
      "Destination,Travel Month,Hotel Tier,Nights,Adults,Children,Land Total INR,Quoted On,Note",
      'Bali,Mar,4 star,5,2,0,"₹1,02,000",14/03/2025,Seminyak villa',
      "goa,2025-12,3,3,2,,45000,2025-11-02,",
      'Goa,december,5*,4,4,1,"Rs 2,10,000.50",,',
    ].join("\n");
    const { samples, problems } = parseRateSamples(csv, destinations);
    expect(problems).toEqual([]);
    expect(samples.map((s) => [s.destination_slug, s.travel_month, s.hotel_tier, s.nights, s.adults, s.children, s.land_total_inr, s.quoted_on])).toEqual([
      ["bali", 3, "4_star", 5, 2, 0, 102000, "2025-03-14"],
      ["goa", 12, "3_star", 3, 2, 0, 45000, "2025-11-02"],
      ["goa", 12, "5_star", 4, 4, 1, 210000.5, null],
    ]);
    expect(samples[0]!.note).toBe("Seminyak villa");
  });

  it("reports every problem with its line and imports nothing", () => {
    const csv = [
      "destination,travel_month,hotel_tier,nights,adults,land_total_inr,quoted_on",
      "Bali,3,4,5,2,85000,",
      "Paris,13,6,0,0,free,31/02/2025",
    ].join("\n");
    const { samples, problems } = parseRateSamples(csv, destinations);
    expect(samples).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(3);
    for (const bit of ["Paris", "travel_month", "hotel_tier", "nights", "adults", "land_total_inr", "quoted_on"]) {
      expect(problems[0]!.message).toContain(bit);
    }
  });

  it("names missing columns", () => {
    const { problems } = parseRateSamples("destination,nights\nBali,5", destinations);
    expect(problems[0]!.message).toContain("travel_month, hotel_tier, adults, land_total_inr");
  });

  it("keeps true duplicates apart and gives re-imports the same keys", () => {
    const csv = "destination,travel_month,hotel_tier,nights,adults,land_total_inr\nBali,3,4,5,2,85000\nBali,3,4,5,2,85000";
    const first = parseRateSamples(csv, destinations).samples.map((s) => s.import_key);
    expect(new Set(first).size).toBe(2);
    expect(parseRateSamples(csv, destinations).samples.map((s) => s.import_key)).toEqual(first);
  });

  it("refuses an empty file or a header with no rows", () => {
    expect(parseRateSamples("", destinations).problems[0]!.message).toContain("empty");
    expect(parseRateSamples("destination,travel_month,hotel_tier,nights,adults,land_total_inr\n", destinations).problems[0]!.message).toContain("no quotes");
  });
});
