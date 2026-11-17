// Prices are stored and quoted in INR. Other currencies are display-only,
// converted with the fx_rates table, and always labelled approximate.

export const DISPLAY_CURRENCIES = ["INR", "USD", "GBP", "EUR", "AED"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export interface FxRate {
  currency: string;
  /** Rupees for one unit of `currency`. */
  inrPerUnit: number;
  rateDate: string; // YYYY-MM-DD
}

export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return (DISPLAY_CURRENCIES as readonly string[]).includes(value);
}

/** ₹1,02,525 — Indian digit grouping, no paise. */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

/** A whole-unit amount in any currency, e.g. "US$1,076", "AED 3,953". */
export function formatMoney(amount: number, currency: string): string {
  if (currency === "INR") return formatInr(amount);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    currencyDisplay: currency === "USD" ? "symbol" : "narrowSymbol",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function findRate(rates: readonly FxRate[], currency: string): FxRate | null {
  let best: FxRate | null = null;
  for (const rate of rates) {
    if (rate.currency !== currency || !(rate.inrPerUnit > 0)) continue;
    if (best === null || rate.rateDate > best.rateDate) best = rate;
  }
  return best;
}

export function convertFromInr(amountInr: number, rate: FxRate): number {
  return amountInr / rate.inrPerUnit;
}

export function convertToInr(amount: number, rate: FxRate): number {
  return amount * rate.inrPerUnit;
}

export interface DisplayPrice {
  /** Always present: the authoritative INR amount. */
  inr: string;
  /** Present when a different display currency and a rate are available. */
  approx: string | null;
  /** e.g. "approx. US$1,076". */
  approxLabel: string | null;
  /** e.g. "Converted at an approximate rate of ₹95.25 per USD (6 Nov 2026)". */
  rateNote: string | null;
}

export function displayPrice(
  amountInr: number,
  displayCurrency: string,
  rates: readonly FxRate[],
): DisplayPrice {
  const inr = formatInr(amountInr);
  if (displayCurrency === "INR") return { inr, approx: null, approxLabel: null, rateNote: null };
  const rate = findRate(rates, displayCurrency);
  if (!rate) return { inr, approx: null, approxLabel: null, rateNote: null };
  const approx = formatMoney(convertFromInr(amountInr, rate), displayCurrency);
  const perUnit = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(rate.inrPerUnit);
  const date = new Date(`${rate.rateDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    inr,
    approx,
    approxLabel: `approx. ${approx}`,
    rateNote: `Converted at an approximate rate of ₹${perUnit} per ${displayCurrency} (${date}). You pay in INR.`,
  };
}

const EURO_REGIONS = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
]);

/**
 * Display currency for a browser locale (navigator.language), per the PRD:
 * USD, GBP, EUR, AED by locale; INR for India; null when we have no
 * confident mapping (show INR only).
 */
export function currencyForLocale(locale: string | null | undefined): DisplayCurrency | null {
  if (!locale) return null;
  let region: string | undefined;
  try {
    region = new Intl.Locale(locale).maximize().region;
  } catch {
    return null;
  }
  switch (region) {
    case "IN":
      return "INR";
    case "US":
      return "USD";
    case "GB":
      return "GBP";
    case "AE":
      return "AED";
    default:
      return region && EURO_REGIONS.has(region) ? "EUR" : null;
  }
}

/** Display currency for a customer's ISO country code. */
export function currencyForCountry(country: string | null | undefined): DisplayCurrency {
  switch ((country ?? "").toUpperCase()) {
    case "US":
      return "USD";
    case "GB":
      return "GBP";
    case "AE":
      return "AED";
    default:
      return EURO_REGIONS.has((country ?? "").toUpperCase()) ? "EUR" : "INR";
  }
}
