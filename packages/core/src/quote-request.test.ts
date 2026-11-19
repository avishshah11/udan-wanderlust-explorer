import { describe, expect, it } from "vitest";
import { describeIssues, quoteRequestSchema, toIntakePayload, todayInIndia } from "./quote-request";

const nextYear = String(Number(todayInIndia().slice(0, 4)) + 1);

describe("quoteRequestSchema", () => {
  it("accepts a minimal request and fills defaults", () => {
    const r = quoteRequestSchema.parse({ destination: "Bali", travel_month: `${nextYear}-05`, nights: 5 });
    expect(r).toMatchObject({ adults: 2, children: 0, budget_currency: "INR", flexibility: "fixed", requested_items: [] });
    expect(toIntakePayload(r)).toMatchObject({ travel_month: `${nextYear}-05-01` });
  });

  it("drops travel_month when a start date is given", () => {
    const r = quoteRequestSchema.parse({ destination: "Goa", start_date: `${nextYear}-01-10`, travel_month: `${nextYear}-01`, nights: 3 });
    expect(toIntakePayload(r).travel_month).toBeUndefined();
  });

  it("explains every problem in words a customer or Claude can act on", () => {
    const result = quoteRequestSchema.safeParse({
      destination: "",
      nights: 0,
      adults: 2,
      children: 2,
      child_ages: [5],
      budget_min: 200000,
      budget_max: 100000,
    });
    expect(result.success).toBe(false);
    const messages = describeIssues(result.error!).join("\n");
    expect(messages).toContain("destination: Tell us where you want to go.");
    expect(messages).toContain("start_date: Give a start date or at least the month you want to travel.");
    expect(messages).toContain("budget_max: The top of the budget is lower than the bottom.");
    expect(messages).toContain("child_ages: Give one age for each child, or leave ages out.");
    expect(messages).toMatch(/nights:/);
  });

  it("rejects past dates", () => {
    const r = quoteRequestSchema.safeParse({ destination: "Goa", start_date: "2020-01-01", nights: 3 });
    expect(r.success).toBe(false);
    expect(describeIssues(r.error!)).toContain("start_date: The start date is in the past.");
  });

  it("validates an OTA comparison", () => {
    const r = quoteRequestSchema.safeParse({
      destination: "Bali",
      travel_month: `${nextYear}-05`,
      nights: 5,
      ota_comparison: { ota_name: "Example OTA", product_name: "Ubud resort", price: 0 },
    });
    expect(r.success).toBe(false);
    expect(describeIssues(r.error!).join()).toContain("The OTA price must be more than zero.");
  });
});

describe("request types", () => {
  it("defaults to a holiday package that needs nights", () => {
    const r = quoteRequestSchema.safeParse({ destination: "Bali", travel_month: `${nextYear}-05` });
    expect(r.success).toBe(false);
    expect(describeIssues(r.error!)).toContain("nights: Give the number of nights.");
  });

  it("takes a return flight and drops package-only fields", () => {
    const r = quoteRequestSchema.parse({
      request_type: "flights",
      origin_city: "Vadodara",
      destination: "Dubai",
      start_date: `${nextYear}-05-10`,
      end_date: `${nextYear}-05-17`,
      nights: 4,
      rooms: 2,
      cabin_class: "business",
    });
    expect(r).toMatchObject({ request_type: "flights", end_date: `${nextYear}-05-17`, cabin_class: "business" });
    expect(r.nights).toBeUndefined();
    expect(r.rooms).toBeUndefined();
  });

  it("takes a one-way flight with no return date", () => {
    const r = quoteRequestSchema.parse({ request_type: "flights", origin_city: "Mumbai", destination: "London", start_date: `${nextYear}-06-01` });
    expect(r.end_date).toBeUndefined();
  });

  it("asks flights for the origin and departure date", () => {
    const r = quoteRequestSchema.safeParse({ request_type: "flights", destination: "Dubai", travel_month: `${nextYear}-05` });
    expect(r.success).toBe(false);
    const messages = describeIssues(r.error!);
    expect(messages).toContain("origin_city: Tell us the city you fly from.");
    expect(messages).toContain("start_date: Give the departure date.");
  });

  it("asks a return flight for its return date and drops it for one way", () => {
    const base = { request_type: "flights", origin_city: "Vadodara", destination: "Dubai", start_date: `${nextYear}-05-10` } as const;
    const missing = quoteRequestSchema.safeParse({ ...base, trip_way: "return" });
    expect(describeIssues(missing.error!)).toContain("end_date: Give the return date, or choose one way.");
    const oneWay = quoteRequestSchema.parse({ ...base, trip_way: "one_way", end_date: `${nextYear}-05-01` });
    expect(oneWay.end_date).toBeUndefined();
    expect("trip_way" in oneWay).toBe(false);
  });

  it("rejects a return before the departure", () => {
    const r = quoteRequestSchema.safeParse({
      request_type: "flights",
      origin_city: "Vadodara",
      destination: "Dubai",
      start_date: `${nextYear}-05-10`,
      end_date: `${nextYear}-05-01`,
    });
    expect(describeIssues(r.error!)).toContain("end_date: The return date is before the departure date.");
  });

  it("works out hotel nights from check-in and check-out", () => {
    const r = quoteRequestSchema.parse({
      request_type: "hotels",
      destination: "Goa",
      start_date: `${nextYear}-01-10`,
      end_date: `${nextYear}-01-13`,
      rooms: 2,
      cabin_class: "economy",
    });
    expect(r).toMatchObject({ nights: 3, rooms: 2 });
    expect(r.cabin_class).toBeUndefined();
  });

  it("asks hotels for a check-out after the check-in", () => {
    const missing = quoteRequestSchema.safeParse({ request_type: "hotels", destination: "Goa", start_date: `${nextYear}-01-10` });
    expect(describeIssues(missing.error!)).toContain("end_date: Give the check-out date.");
    const backwards = quoteRequestSchema.safeParse({
      request_type: "hotels",
      destination: "Goa",
      start_date: `${nextYear}-01-10`,
      end_date: `${nextYear}-01-10`,
    });
    expect(describeIssues(backwards.error!)).toContain("end_date: The check-out date must be after the check-in date.");
  });

  it("rejects an unknown type with the allowed values", () => {
    const r = quoteRequestSchema.safeParse({ request_type: "cruise", destination: "Goa", travel_month: `${nextYear}-01`, nights: 3 });
    expect(describeIssues(r.error!).join()).toContain("package, flights, hotels");
  });
});
