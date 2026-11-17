import { describe, expect, it } from "vitest";
import {
  type FxRate,
  currencyForCountry,
  currencyForLocale,
  displayPrice,
  findRate,
  formatInr,
  formatMoney,
} from "./currency";

const rates: FxRate[] = [
  { currency: "USD", inrPerUnit: 95.2492, rateDate: "2026-11-06" },
  { currency: "USD", inrPerUnit: 90, rateDate: "2026-10-01" },
  { currency: "AED", inrPerUnit: 25.9358, rateDate: "2026-11-06" },
  { currency: "GBP", inrPerUnit: 127.6015, rateDate: "2026-11-06" },
];

describe("formatting", () => {
  it("uses Indian digit grouping for INR", () => {
    expect(formatInr(102525)).toBe("₹1,02,525");
    expect(formatInr(12345678.4)).toBe("₹1,23,45,678");
  });

  it("formats other currencies in whole units", () => {
    expect(formatMoney(1076.4, "USD")).toBe("US$1,076");
    expect(formatMoney(803.6, "GBP")).toBe("£804");
  });
});

describe("display conversion", () => {
  it("uses the latest rate", () => {
    expect(findRate(rates, "USD")?.inrPerUnit).toBe(95.2492);
    expect(findRate(rates, "EUR")).toBeNull();
  });

  it("always shows INR and labels the conversion approximate", () => {
    const p = displayPrice(102525, "AED", rates);
    expect(p.inr).toBe("₹1,02,525");
    expect(p.approxLabel).toMatch(/^approx\. AED\s?3,953$/);
    expect(p.rateNote).toContain("approximate rate of ₹25.94 per AED (6 Nov 2026)");
    expect(p.rateNote).toContain("You pay in INR");
  });

  it("shows INR only when the display currency is INR or has no rate", () => {
    expect(displayPrice(5000, "INR", rates).approx).toBeNull();
    expect(displayPrice(5000, "EUR", rates).approx).toBeNull();
  });
});

describe("currency by locale and country", () => {
  it("maps locales per the PRD (USD, GBP, EUR, AED) and India to INR", () => {
    expect(currencyForLocale("en-US")).toBe("USD");
    expect(currencyForLocale("en-GB")).toBe("GBP");
    expect(currencyForLocale("de-DE")).toBe("EUR");
    expect(currencyForLocale("fr")).toBe("EUR");
    expect(currencyForLocale("ar-AE")).toBe("AED");
    expect(currencyForLocale("en-IN")).toBe("INR");
    expect(currencyForLocale("hi")).toBe("INR");
  });

  it("returns null when unsure", () => {
    expect(currencyForLocale("ja-JP")).toBeNull();
    expect(currencyForLocale("")).toBeNull();
    expect(currencyForLocale("not a locale!!")).toBeNull();
  });

  it("maps customer countries", () => {
    expect(currencyForCountry("ae")).toBe("AED");
    expect(currencyForCountry("NL")).toBe("EUR");
    expect(currencyForCountry(null)).toBe("INR");
  });
});
