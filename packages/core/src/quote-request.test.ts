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
