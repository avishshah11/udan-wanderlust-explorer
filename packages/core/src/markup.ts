// Markup: sell price = net cost x (1 + markup %), rounded to the rupee.
//
// The markup % comes from the most specific active rule for the line's
// destination group and product type, unless the pricer overrides it for
// this quote. Overrides are stored on the line (markup_overridden) and the
// database writes an audit_log entry for every one.
//
// computeSellPrice() must agree with the generated column in quote_lines:
//   round(net_cost * (1 + markup_pct / 100), 0)
// Postgres rounds numeric half away from zero; this does the same in exact
// integer arithmetic (paise x basis points) so floating point never decides
// a rupee.

import type { LineType } from "./domain";

export const MAX_MARKUP_PCT = 200;

export interface MarkupRule {
  id: string;
  destinationGroup: string | null; // null = any group
  productType: LineType | null; // null = any product type
  markupPct: number;
  active: boolean;
}

export type MarkupSource = "rule" | "override";

export interface PricedLine {
  netCost: number;
  markupPct: number;
  sellPrice: number;
  ruleId: string | null;
  overridden: boolean;
  source: MarkupSource;
}

export class MarkupError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_net_cost" | "invalid_markup" | "no_rule",
  ) {
    super(message);
    this.name = "MarkupError";
  }
}

function assertNetCost(netCost: number): void {
  if (!Number.isFinite(netCost) || netCost < 0) {
    throw new MarkupError("Net cost must be zero or a positive amount in rupees.", "invalid_net_cost");
  }
  if (Math.round(netCost * 100) / 100 !== netCost) {
    throw new MarkupError("Net cost can have at most two decimal places (paise).", "invalid_net_cost");
  }
}

function assertMarkup(markupPct: number): void {
  if (!Number.isFinite(markupPct) || markupPct < 0 || markupPct > MAX_MARKUP_PCT) {
    throw new MarkupError(`Markup must be between 0% and ${MAX_MARKUP_PCT}%.`, "invalid_markup");
  }
  if (Math.round(markupPct * 100) / 100 !== markupPct) {
    throw new MarkupError("Markup can have at most two decimal places.", "invalid_markup");
  }
}

/** Sell price in whole rupees for a net cost (INR) and markup percentage. */
export function computeSellPrice(netCost: number, markupPct: number): number {
  assertNetCost(netCost);
  assertMarkup(markupPct);
  const paise = BigInt(Math.round(netCost * 100));
  const factorBp = 10_000n + BigInt(Math.round(markupPct * 100)); // basis points of (1 + markup)
  // rupees = paise * factorBp / (100 * 10_000); round half away from zero (values are >= 0)
  const denominator = 1_000_000n;
  const numerator = paise * factorBp;
  return Number((numerator * 2n + denominator) / (denominator * 2n));
}

/** Specificity: group + type (3) > group only (2) > type only (1) > catch-all (0). */
function specificity(rule: MarkupRule): number {
  return (rule.destinationGroup !== null ? 2 : 0) + (rule.productType !== null ? 1 : 0);
}

/** The most specific active rule that matches, or null. */
export function resolveMarkupRule(
  rules: readonly MarkupRule[],
  match: { destinationGroup: string | null; productType: LineType },
): MarkupRule | null {
  let best: MarkupRule | null = null;
  for (const rule of rules) {
    if (!rule.active) continue;
    if (rule.destinationGroup !== null && rule.destinationGroup !== match.destinationGroup) continue;
    if (rule.productType !== null && rule.productType !== match.productType) continue;
    if (best === null || specificity(rule) > specificity(best)) best = rule;
  }
  return best;
}

/**
 * Price one line. With no override, the matching rule's markup applies; if
 * no rule matches, the pricer must enter a markup (MarkupError "no_rule").
 * An override equal to the rule's markup is not counted as an override.
 */
export function priceLine(input: {
  netCost: number;
  productType: LineType;
  destinationGroup: string | null;
  rules: readonly MarkupRule[];
  overrideMarkupPct?: number | null;
}): PricedLine {
  const rule = resolveMarkupRule(input.rules, {
    destinationGroup: input.destinationGroup,
    productType: input.productType,
  });
  const override = input.overrideMarkupPct ?? null;

  if (override !== null && (rule === null || override !== rule.markupPct)) {
    return {
      netCost: input.netCost,
      markupPct: override,
      sellPrice: computeSellPrice(input.netCost, override),
      ruleId: rule?.id ?? null,
      overridden: true,
      source: "override",
    };
  }
  if (rule === null) {
    throw new MarkupError(
      "No markup rule covers this destination group and product type. Enter a markup % for this line.",
      "no_rule",
    );
  }
  return {
    netCost: input.netCost,
    markupPct: rule.markupPct,
    sellPrice: computeSellPrice(input.netCost, rule.markupPct),
    ruleId: rule.id,
    overridden: false,
    source: "rule",
  };
}

/**
 * The markup % (two decimals) whose sell price is closest to a target, for
 * pricers who want a round final number. Markup is stored to 0.01%, so the
 * price moves in steps of net cost / 10,000 and can land up to half a step
 * from the target (about ₹2 on a ₹42,000 line).
 */
export function markupForTargetSell(netCost: number, targetSell: number): number {
  assertNetCost(netCost);
  if (netCost === 0) throw new MarkupError("Cannot derive a markup from a zero net cost.", "invalid_net_cost");
  if (!Number.isFinite(targetSell) || targetSell < netCost) {
    throw new MarkupError("The target price must be at least the net cost.", "invalid_markup");
  }
  const raw = (targetSell / netCost - 1) * 10_000; // in units of 0.01%
  const candidates = [Math.floor(raw), Math.ceil(raw)]
    .map((units) => units / 100)
    .filter((pct) => pct >= 0 && pct <= MAX_MARKUP_PCT);
  if (candidates.length === 0) {
    throw new MarkupError(`That price needs a markup above ${MAX_MARKUP_PCT}%.`, "invalid_markup");
  }
  let best = candidates[0]!;
  for (const pct of candidates) {
    if (Math.abs(computeSellPrice(netCost, pct) - targetSell) < Math.abs(computeSellPrice(netCost, best) - targetSell)) {
      best = pct;
    }
  }
  return best;
}

/** Quote total in rupees: the sum of line sell prices. */
export function quoteTotal(lines: readonly { sellPrice: number }[]): number {
  return lines.reduce((sum, line) => sum + line.sellPrice, 0);
}

/** Margin on a set of lines, for the desk only. */
export function quoteMargin(lines: readonly { netCost: number; sellPrice: number }[]): {
  net: number;
  sell: number;
  margin: number;
  marginPct: number | null;
} {
  const net = lines.reduce((s, l) => s + l.netCost, 0);
  const sell = lines.reduce((s, l) => s + l.sellPrice, 0);
  const margin = Math.round((sell - net) * 100) / 100;
  return { net, sell, margin, marginPct: sell > 0 ? Math.round((margin / sell) * 1000) / 10 : null };
}
