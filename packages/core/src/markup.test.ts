import { describe, expect, it } from "vitest";
import { POSTGRES_SELL_PRICES } from "./__fixtures__/postgres-sell-prices";
import {
  MarkupError,
  type MarkupRule,
  computeSellPrice,
  markupForTargetSell,
  priceLine,
  quoteMargin,
  quoteTotal,
  resolveMarkupRule,
} from "./markup";

const rules: MarkupRule[] = [
  { id: "any", destinationGroup: null, productType: null, markupPct: 10, active: true },
  { id: "flight", destinationGroup: null, productType: "flight", markupPct: 3, active: true },
  { id: "sea", destinationGroup: "south-east-asia", productType: null, markupPct: 11, active: true },
  { id: "sea-hotel", destinationGroup: "south-east-asia", productType: "hotel", markupPct: 12, active: true },
  { id: "old", destinationGroup: "south-east-asia", productType: "activity", markupPct: 40, active: false },
];

describe("computeSellPrice", () => {
  it("matches Postgres round(net * (1 + pct/100), 0) for 200 cases, including exact halves", () => {
    for (const [net, pct, expected] of POSTGRES_SELL_PRICES) {
      expect(computeSellPrice(net, pct), `net ${net} @ ${pct}%`).toBe(expected);
    }
  });

  it("rounds half away from zero where floats would not", () => {
    // 50 * 1.15 = 57.5 exactly; in floating point it is 57.49999999999999
    expect(Math.round(50 * (1 + 15 / 100))).toBe(57);
    expect(computeSellPrice(50, 15)).toBe(58);
  });

  it("rejects bad input with messages a pricer can act on", () => {
    expect(() => computeSellPrice(-1, 10)).toThrow(/positive amount/);
    expect(() => computeSellPrice(Number.NaN, 10)).toThrow(MarkupError);
    expect(() => computeSellPrice(10.001, 10)).toThrow(/two decimal places/);
    expect(() => computeSellPrice(100, -1)).toThrow(/between 0% and 200%/);
    expect(() => computeSellPrice(100, 201)).toThrow(/between 0% and 200%/);
  });
});

describe("resolveMarkupRule", () => {
  it("prefers group + type over group, over type, over the catch-all", () => {
    expect(resolveMarkupRule(rules, { destinationGroup: "south-east-asia", productType: "hotel" })?.id).toBe("sea-hotel");
    expect(resolveMarkupRule(rules, { destinationGroup: "south-east-asia", productType: "transfer" })?.id).toBe("sea");
    expect(resolveMarkupRule(rules, { destinationGroup: "domestic", productType: "flight" })?.id).toBe("flight");
    expect(resolveMarkupRule(rules, { destinationGroup: "domestic", productType: "hotel" })?.id).toBe("any");
  });

  it("group beats product type when both partial rules match", () => {
    expect(resolveMarkupRule(rules, { destinationGroup: "south-east-asia", productType: "flight" })?.id).toBe("sea");
  });

  it("ignores inactive rules", () => {
    expect(resolveMarkupRule(rules, { destinationGroup: "south-east-asia", productType: "activity" })?.id).toBe("sea");
  });

  it("returns null when nothing matches", () => {
    expect(resolveMarkupRule([], { destinationGroup: null, productType: "hotel" })).toBeNull();
  });
});

describe("priceLine", () => {
  it("applies the matching rule", () => {
    expect(priceLine({ netCost: 42000, productType: "hotel", destinationGroup: "south-east-asia", rules })).toEqual({
      netCost: 42000,
      markupPct: 12,
      sellPrice: 47040,
      ruleId: "sea-hotel",
      overridden: false,
      source: "rule",
    });
  });

  it("records an override and keeps the rule it replaced", () => {
    const line = priceLine({
      netCost: 5500,
      productType: "activity",
      destinationGroup: "south-east-asia",
      rules,
      overrideMarkupPct: 15,
    });
    expect(line).toMatchObject({ markupPct: 15, sellPrice: 6325, ruleId: "sea", overridden: true, source: "override" });
  });

  it("does not count an override equal to the rule as an override", () => {
    const line = priceLine({ netCost: 1000, productType: "hotel", destinationGroup: "south-east-asia", rules, overrideMarkupPct: 12 });
    expect(line.overridden).toBe(false);
  });

  it("asks for a markup when no rule covers the line", () => {
    expect(() => priceLine({ netCost: 1000, productType: "hotel", destinationGroup: "domestic", rules: [] })).toThrow(
      /Enter a markup % for this line/,
    );
    const line = priceLine({ netCost: 1000, productType: "hotel", destinationGroup: "domestic", rules: [], overrideMarkupPct: 8 });
    expect(line).toMatchObject({ sellPrice: 1080, overridden: true, ruleId: null });
  });
});

describe("totals and helpers", () => {
  it("totals sell prices and computes margin for the desk", () => {
    const lines = [
      { netCost: 42000, sellPrice: 47040 },
      { netCost: 38000, sellPrice: 42560 },
    ];
    expect(quoteTotal(lines)).toBe(89600);
    expect(quoteMargin(lines)).toEqual({ net: 80000, sell: 89600, margin: 9600, marginPct: 10.7 });
  });

  it("derives a markup for a round target price", () => {
    // A 0.01% markup step on ₹42,000 moves the price by ₹4.20, so the best
    // achievable price is within half a step of the target.
    const pct = markupForTargetSell(42000, 47000);
    expect(Math.abs(computeSellPrice(42000, pct) - 47000)).toBeLessThanOrEqual(42000 / 20000);
    expect(pct).toBe(11.9); // 11.90% gives ₹46,998 and 11.91% gives ₹47,002: a tie, lower markup wins
    expect(markupForTargetSell(100000, 112000)).toBe(12);
    expect(() => markupForTargetSell(42000, 40000)).toThrow(/at least the net cost/);
  });
});
