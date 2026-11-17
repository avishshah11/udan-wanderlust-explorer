import { describe, expect, it } from "vitest";
import { assertNoTurnaroundLanguage, findTurnaroundLanguage } from "./copy-guard";
import { normalizeReference } from "./reference";
import { CUSTOMER_STATUS, RECHECK_STATUS, customerStatus } from "./status";

describe("no turnaround language (rule 1)", () => {
  it.each([
    "We'll reply within 2 hours.",
    "Quotes within a day",
    "Expect your quote within 24 hours",
    "24-hour turnaround",
    "Our turnaround is fast",
    "ETA: Monday",
    "Same-day quotes",
    "You'll hear from us by tomorrow",
    "We will get back to you shortly",
    "Quote in 3 business days",
    "Average response time: 4 hrs",
  ])("flags %j", (text) => {
    expect(findTurnaroundLanguage(text).length).toBeGreaterThan(0);
  });

  it.each([
    "Bali, 5 nights, 4-star hotels",
    "This quote is valid until 24 Nov 2026.",
    "Valid for 3 days",
    "Full-day Ubud tour with guide",
    "Indicative price now, best price in your inbox",
    "Established 1997",
  ])("allows %j", (text) => {
    expect(findTurnaroundLanguage(text)).toEqual([]);
  });

  it("every customer status string is clean", () => {
    for (const [status, copy] of Object.entries({ ...CUSTOMER_STATUS, recheck: RECHECK_STATUS })) {
      assertNoTurnaroundLanguage(`${copy.label} ${copy.detail}`, `status ${status}`);
    }
  });
});

describe("customer status", () => {
  it("shows re-checking when an expired quote was accepted", () => {
    expect(customerStatus({ status: "pricing", acceptRequestedAt: "2026-11-18T10:00:00Z" })).toBe(RECHECK_STATUS);
    expect(customerStatus({ status: "pricing" }).label).toBe("Being priced");
    expect(customerStatus({ status: "awaiting_payment" }).label).toBe("Accepted, awaiting payment");
  });
});

describe("references", () => {
  it("normalises what people type", () => {
    expect(normalizeReference("udn 2611 k7qmx")).toBe("UDN-2611-K7QMX");
    expect(normalizeReference(" UDN_2611_K7QMX ")).toBe("UDN-2611-K7QMX");
    expect(normalizeReference("UDN2611K7QMX")).toBe("UDN-2611-K7QMX");
  });

  it("rejects ambiguous characters and other shapes", () => {
    expect(normalizeReference("UDN-2611-K7QM0")).toBeNull(); // zero is not in the alphabet
    expect(normalizeReference("UDN-2611-K7QMI")).toBeNull();
    expect(normalizeReference("ABC-2611-K7QMX")).toBeNull();
    expect(normalizeReference("")).toBeNull();
  });
});

import { tripSummary } from "./format";
describe("tripSummary", () => {
  it("reads naturally", () => {
    expect(tripSummary({ destination: "Bali", nights: 5, adults: 2, hotel_tier: "4_star", start_date: "2027-05-10" })).toBe(
      "Bali, 5 nights, 2 adults, 4-star, from 10 May 2027",
    );
    expect(tripSummary({ destination: "Goa", nights: 1, adults: 1, children: 1, travel_month: "2027-01-01" })).toBe(
      "Goa, 1 night, 1 adult, 1 child, January 2027",
    );
  });
});
