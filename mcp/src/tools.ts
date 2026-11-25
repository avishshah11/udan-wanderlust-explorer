// The five Udan tools, exactly as specified in the PRD. Read and write tools
// are separate; every tool has a title and annotations; descriptions say what
// the tool does and when to use it, nothing else. Responses never state a
// turnaround time.

import {
  type CabinClass,
  type FxRate,
  type HotelTier,
  type PaymentKind,
  type PaymentStatus,
  REFERENCE_HELP,
  type RequestStatus,
  type RequestType,
  customerStatus,
  describeIssues,
  displayPrice,
  findRate,
  formatInr,
  normalizeReference,
  partyText,
  quoteRequestSchema,
  toIntakePayload,
  tripSummary,
} from "@udan/core";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Data access (implemented against Supabase in db.ts; faked in tests)
// ---------------------------------------------------------------------------

export interface DestinationInfo {
  slug: string;
  name: string;
  bestMonths: number[];
  typicalInclusions: string[];
}

/** A rate-card band for the whole party (per-adult prices times adults). */
export interface PriceBand {
  low: number;
  high: number;
  sampleCount: number;
  /** What the range is based on and covers (core bandBasis()). */
  basis: string;
}

export interface CustomerQuoteData {
  reference: string;
  status: RequestStatus;
  request_type: RequestType;
  destination: string;
  origin_city: string | null;
  start_date: string | null;
  end_date: string | null;
  travel_month: string;
  nights: number | null;
  adults: number;
  children: number;
  rooms: number | null;
  hotel_tier: HotelTier | null;
  cabin_class: CabinClass | null;
  preferred_currency: string;
  valid_until: string | null;
  is_expired: boolean;
  accepted_at: string | null;
  accept_requested_at: string | null;
  total_inr: number | null;
  inclusions: string | null;
  exclusions: string | null;
  lines: { type: string; description: string; price_inr: number }[];
  payments: { kind: PaymentKind; amount: number; status: PaymentStatus }[];
  /** Messages from Udan's desk, oldest first. */
  messages?: { body: string; sent_at: string; from: string }[];
}

export interface PublicData {
  findDestination(name: string): Promise<DestinationInfo | null>;
  rates(): Promise<FxRate[]>;
  /** The most specific public rate-card band for the trip, or null (fewer than 5 matching quotes). */
  band(input: {
    destinationSlug: string | null;
    month: number | null;
    tier: HotelTier | null;
    nights: number;
    adults: number;
    children: number;
  }): Promise<PriceBand | null>;
}

export interface UserData {
  submitRequest(payload: Record<string, unknown>): Promise<{ reference: string } | { error: string }>;
  quote(reference: string): Promise<CustomerQuoteData | null>;
  accept(reference: string): Promise<{ result: string; status?: string; total_inr?: number }>;
}

export interface SignedInUser {
  id: string;
  email: string;
  data: UserData;
}

export interface ToolContext {
  publicData: PublicData;
  /** Null when the request carried no valid Udan sign-in. */
  user: SignedInUser | null;
  appUrl: string;
  /** Fire-and-forget work after the response (emails). */
  background(task: Promise<unknown>): void;
  notify: {
    requestReceived(user: SignedInUser, reference: string, summary: string, typical: PriceBand | null): Promise<unknown>;
    accepted(user: SignedInUser, reference: string, totalInr: number | null): Promise<unknown>;
    staff(event: "new_request" | "accepted" | "recheck", user: SignedInUser, reference: string, summary: string): Promise<unknown>;
  };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const tier = z.enum(["3_star", "4_star", "5_star"]).describe("Hotel category: 3_star, 4_star or 5_star");
const currency = z.enum(["INR", "USD", "GBP", "EUR", "AED"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use a date in the form YYYY-MM-DD." });
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Use a month in the form YYYY-MM." });
const reference = z.string().min(5).max(40).describe("Quote reference, for example UDN-2611-K7QMX");

export const indicativeInput = {
  destination: z.string().trim().min(2).max(200).describe("Destination, for example Bali, Kerala or Dubai"),
  nights: z.int().min(1).max(90).describe("Number of nights"),
  adults: z.int().min(1).max(50).default(2).describe("Number of adults"),
  children: z.int().min(0).max(20).default(0).describe("Number of children"),
  hotel_tier: tier.optional(),
  travel_month: month.optional().describe("Month of travel, YYYY-MM"),
};

export const compareInput = {
  ota_name: z.string().trim().min(2).max(100).describe("Name of the booking site the price is from"),
  product_name: z.string().trim().min(2).max(300).describe("Hotel or package name as shown on that site"),
  destination: z.string().trim().min(2).max(200).optional().describe("Destination city or region, if known"),
  check_in: isoDate.optional().describe("Check-in or start date, YYYY-MM-DD"),
  check_out: isoDate.optional().describe("Check-out or end date, YYYY-MM-DD"),
  room_type: z.string().trim().max(200).optional().describe("Room or package type"),
  adults: z.int().min(1).max(50).default(2),
  children: z.int().min(0).max(20).default(0),
  ota_price: z.number().positive().max(1e9).describe("Total price shown on the booking site"),
  currency: currency.default("INR").describe("Currency of ota_price"),
};

const itemSchema = z.object({
  type: z.enum(["hotel", "flight", "transfer", "activity", "visa", "insurance", "package", "other"]),
  description: z.string().trim().min(2).max(300).describe("What is wanted, e.g. 'Ubud, 3 nights, pool villa'"),
  city: z.string().trim().max(100).optional(),
  start_date: isoDate.optional(),
  nights: z.int().min(1).max(90).optional(),
});

export const requestQuoteInput = {
  request_type: z
    .enum(["package", "flights", "hotels"])
    .default("package")
    .describe("package: a whole holiday (hotels, transfers, sightseeing, optionally flights). flights: air tickets only. hotels: a hotel stay only"),
  destination: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .describe("package: main destination or route, e.g. 'Bali' or 'Jaipur, Udaipur'. flights: the city flown to. hotels: the city or area of the stay"),
  start_date: isoDate
    .optional()
    .describe("YYYY-MM-DD. package: start date (give this or travel_month). flights: departure date (required). hotels: check-in date (required)"),
  end_date: isoDate.optional().describe("YYYY-MM-DD. flights: return date; leave out for a one-way trip. hotels: check-out date (required)"),
  travel_month: month.optional().describe("package only: month of travel, YYYY-MM, when dates are open"),
  nights: z.int().min(1).max(90).optional().describe("package: number of nights (required). Not used for flights; worked out from the dates for hotels"),
  rooms: z.int().min(1).max(20).optional().describe("hotels: number of rooms"),
  cabin_class: z.enum(["economy", "premium_economy", "business", "first"]).optional().describe("flights: cabin class"),
  adults: z.int().min(1).max(50).default(2),
  children: z.int().min(0).max(20).default(0),
  child_ages: z.array(z.int().min(0).max(17)).max(20).optional().describe("One age per child"),
  hotel_tier: tier.optional(),
  origin_city: z.string().trim().max(100).optional().describe("City the trip starts from; required for flights"),
  items: z.array(itemSchema).max(30).optional().describe("Itinerary line items"),
  inclusions_wanted: z.array(z.enum(["flights", "hotel", "transfers", "sightseeing", "meals", "visa", "insurance"])).optional(),
  budget_min: z.number().nonnegative().max(1e9).optional(),
  budget_max: z.number().nonnegative().max(1e9).optional(),
  budget_currency: currency.default("INR"),
  flexibility: z.enum(["fixed", "few_days", "flexible"]).default("fixed"),
  preferred_currency: currency.default("INR").describe("Currency to show next to INR on the quote"),
  notes: z.string().trim().max(4000).optional(),
  ota_comparison: z
    .object({
      ota_name: z.string().trim().min(2).max(100),
      product_name: z.string().trim().min(2).max(300),
      room_type: z.string().trim().max(200).optional(),
      price: z.number().positive(),
      currency: currency.default("INR"),
    })
    .optional()
    .describe("A booking-site price to beat, if the user has one"),
};

export const referenceInput = { reference };

const bandOut = z.object({ low_inr: z.number(), high_inr: z.number(), sample_count: z.int(), basis: z.string() }).nullable();

export const indicativeOutput = {
  destination: z.string(),
  party: z.string(),
  nights: z.int(),
  band: bandOut,
  best_months: z.array(z.string()),
  sample_inclusions: z.array(z.string()),
  note: z.string(),
};

export const compareOutput = {
  ota_name: z.string(),
  product_name: z.string(),
  ota_price: z.number(),
  ota_currency: z.string(),
  ota_price_inr: z.number().nullable(),
  udan_band: bandOut,
  delta_inr: z.number().nullable(),
  commitment: z.string(),
  next_step: z.string(),
};

export const requestQuoteOutput = {
  reference: z.string(),
  status: z.string(),
  account_url: z.string(),
  confirmation_emailed_to: z.string(),
  typical_band: bandOut,
};

export const quoteOutput = {
  reference: z.string(),
  status: z.string(),
  status_label: z.string(),
  status_detail: z.string(),
  trip: z.string(),
  total_inr: z.number().nullable(),
  total_display: z.string().nullable(),
  valid_until: z.string().nullable(),
  expired: z.boolean(),
  line_items: z.array(z.object({ type: z.string(), description: z.string(), price_inr: z.number() })),
  inclusions: z.string().nullable(),
  exclusions: z.string().nullable(),
  payments: z.array(z.object({ kind: z.string(), amount_inr: z.number(), status: z.string() })),
  messages: z.array(z.object({ from: z.string(), sent_at: z.string(), text: z.string() })),
  account_url: z.string(),
};

export const confirmOutput = {
  reference: z.string(),
  result: z.enum(["accepted", "already_accepted", "recheck"]),
  status: z.string(),
  message: z.string(),
  account_url: z.string(),
};

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const SIGN_IN_REQUIRED = new Set(["request_quote", "get_quote", "confirm_booking"]);

export const TOOL_DEFINITIONS = {
  get_indicative_price: {
    title: "Typical price for a trip",
    description:
      "Returns a typical price range in INR for a holiday at a destination, based on Udan Tours and Travels' own past quotes for the same hotel category and a similar number of nights, using the travel month's own range when there are enough quotes for it. The range covers hotel, transfers, sightseeing and meals for the adults (per adult on twin sharing); flights, visa, insurance and children are priced in the firm quote. It states how many quotes it is based on, and is returned only when at least five past quotes match; otherwise the response says that no range is available. Use it when someone wants an approximate cost before asking for a firm quote. Does not require sign-in.",
    inputSchema: indicativeInput,
    outputSchema: indicativeOutput,
    annotations: { title: "Typical price for a trip", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  compare_price: {
    title: "Compare a booking-site price",
    description:
      "Compares a price found on a booking site with Udan Tours and Travels' typical prices for a similar trip. Returns the booking-site price in INR, Udan's typical range where one exists (hotel, transfers, sightseeing and meals; no flights), and the difference. Use it when someone shares a hotel or package price from another site and asks whether Udan can offer it for less. Does not require sign-in.",
    inputSchema: compareInput,
    outputSchema: compareOutput,
    annotations: { title: "Compare a booking-site price", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  request_quote: {
    title: "Request a firm quote",
    description:
      "Sends a firm quote request to Udan Tours and Travels' pricing desk for the signed-in user and returns its reference number. The request can be a whole holiday package, flights only or a hotel stay only (request_type). A confirmation is emailed to the user and the request appears in their Udan account, where the priced quote is delivered. Use it when someone wants an exact price for a trip, a flight or a hotel. Requires sign-in.",
    inputSchema: requestQuoteInput,
    outputSchema: requestQuoteOutput,
    annotations: { title: "Request a firm quote", readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  get_quote: {
    title: "Check a quote",
    description:
      "Returns the status, total price, validity date and priced line items of one of the signed-in user's Udan quotes, looked up by reference number (for example UDN-2611-K7QMX), with any messages Udan's team has sent about it. Use it to check on a quote request or to read a quote that has been sent. Requires sign-in.",
    inputSchema: referenceInput,
    outputSchema: quoteOutput,
    annotations: { title: "Check a quote", readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  confirm_booking: {
    title: "Accept a quote",
    description:
      "Accepts one of the signed-in user's sent Udan quotes by reference number. The quote's price and inclusions are fixed, its status becomes awaiting payment, and Udan's team is notified; payment details are emailed to the user by Udan's team. No payment is made through this tool. Use it when the user has said they want to accept a specific quote. Requires sign-in.",
    inputSchema: referenceInput,
    outputSchema: confirmOutput,
    annotations: { title: "Accept a quote", readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
} as const;

export type ToolName = keyof typeof TOOL_DEFINITIONS;

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Status copy is written for the account page ("here"); in Claude, say where. */
const inAccount = (detail: string) => detail.replace(/\bhere\b/g, "in the Udan account");

function ok(text: string, structured: Record<string, unknown>): CallToolResult {
  return { content: [{ type: "text", text }], structuredContent: structured };
}

export function toolError(text: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text }] };
}

function signInError(tool: string): CallToolResult {
  return toolError(
    `${tool} needs the user to be signed in to Udan. Connect the Udan Tours and Travels connector with the user's Udan account (email sign-in link or Google) in Claude's connector settings, then try again.`,
  );
}

type Input<T extends Record<string, z.ZodType>> = z.output<z.ZodObject<T>>;

export async function getIndicativePrice(ctx: ToolContext, args: Input<typeof indicativeInput>): Promise<CallToolResult> {
  const dest = await ctx.publicData.findDestination(args.destination);
  const monthNum = args.travel_month ? Number(args.travel_month.slice(5, 7)) : null;
  const band = await ctx.publicData.band({
    destinationSlug: dest?.slug ?? null,
    month: monthNum,
    tier: args.hotel_tier ?? null,
    nights: args.nights,
    adults: args.adults,
    children: args.children,
  });
  const party = partyText(args.adults, args.children);
  const name = dest?.name ?? args.destination;
  const bestMonths = (dest?.bestMonths ?? []).map((m) => MONTH_NAMES[m - 1]!);
  const inclusions = dest?.typicalInclusions ?? [];

  const note = band
    ? `${band.basis} A firm quote for exact dates is priced by Udan's team and delivered by email and in the user's Udan account.`
    : `Udan does not yet have enough past quotes for ${name} to give a typical range (it needs at least five similar quotes). A firm quote can be requested with request_quote; it is priced by Udan's team against supplier rates and delivered by email and in the user's Udan account.`;

  const lines = [
    band ? `Typical price for ${name}, ${args.nights} nights, ${party}: ${formatInr(band.low)} to ${formatInr(band.high)}.` : `No typical price range available yet for ${name}.`,
    note,
  ];
  if (bestMonths.length) lines.push(`Best months: ${bestMonths.join(", ")}.`);
  if (inclusions.length) lines.push(`A typical Udan trip here includes: ${inclusions.join("; ")}.`);

  return ok(lines.join("\n"), {
    destination: name,
    party,
    nights: args.nights,
    band: band ? { low_inr: band.low, high_inr: band.high, sample_count: band.sampleCount, basis: band.basis } : null,
    best_months: bestMonths,
    sample_inclusions: inclusions,
    note,
  });
}

export async function comparePrice(ctx: ToolContext, args: Input<typeof compareInput>): Promise<CallToolResult> {
  const rates = await ctx.publicData.rates();
  const rate = args.currency === "INR" ? null : findRate(rates, args.currency);
  const otaInr = args.currency === "INR" ? args.ota_price : rate ? Math.round(args.ota_price * rate.inrPerUnit) : null;

  let nights = 0;
  if (args.check_in && args.check_out) {
    nights = Math.round((Date.parse(args.check_out) - Date.parse(args.check_in)) / 86400000);
    if (!(nights > 0)) return toolError("check_out must be after check_in (dates as YYYY-MM-DD).");
  }
  const dest = args.destination ? await ctx.publicData.findDestination(args.destination) : null;
  const band =
    nights > 0
      ? await ctx.publicData.band({
          destinationSlug: dest?.slug ?? null,
          month: args.check_in ? Number(args.check_in.slice(5, 7)) : null,
          tier: null,
          nights,
          adults: args.adults,
          children: args.children,
        })
      : null;
  const delta = band && otaInr != null ? Math.round(otaInr - (band.low + band.high) / 2) : null;
  const commitment =
    "Udan's team prices the same trip at its agent rates. If Udan cannot offer it for less than this price, the quote says so plainly.";
  const nextStep =
    "For an exact price, request_quote (sign-in required) sends this trip, with this price attached as the price to beat, to Udan's pricing desk; the quote is delivered by email and in the user's Udan account.";

  const lines = [
    `${args.ota_name}: ${args.product_name}${args.room_type ? `, ${args.room_type}` : ""}, ${args.currency} ${args.ota_price.toLocaleString("en-IN")}${otaInr != null && args.currency !== "INR" ? ` (about ${formatInr(otaInr)} at an approximate rate)` : ""}.`,
    band
      ? `Udan's typical range for a similar trip is ${formatInr(band.low)} to ${formatInr(band.high)} (${band.basis}) The difference is about ${formatInr(Math.abs(delta ?? 0))} ${delta != null && delta >= 0 ? "in Udan's favour" : "above this price"}.`
      : "Udan does not have a typical range for this trip yet, so the comparison needs a firm quote.",
    commitment,
    nextStep,
  ];
  if (otaInr == null) lines.splice(1, 0, `No exchange rate is available for ${args.currency}; the desk will convert it when pricing.`);

  return ok(lines.join("\n"), {
    ota_name: args.ota_name,
    product_name: args.product_name,
    ota_price: args.ota_price,
    ota_currency: args.currency,
    ota_price_inr: otaInr,
    udan_band: band ? { low_inr: band.low, high_inr: band.high, sample_count: band.sampleCount, basis: band.basis } : null,
    delta_inr: delta,
    commitment,
    next_step: nextStep,
  });
}

export async function requestQuote(ctx: ToolContext, args: Input<typeof requestQuoteInput>): Promise<CallToolResult> {
  if (!ctx.user) return signInError("request_quote");
  const user = ctx.user;
  const parsed = quoteRequestSchema.safeParse({
    request_type: args.request_type,
    destination: args.destination,
    start_date: args.start_date,
    end_date: args.end_date,
    travel_month: args.travel_month,
    nights: args.nights,
    rooms: args.rooms,
    cabin_class: args.cabin_class,
    adults: args.adults,
    children: args.children,
    child_ages: args.child_ages ?? [],
    hotel_tier: args.hotel_tier,
    origin_city: args.origin_city,
    requested_items: args.items ?? [],
    inclusions_wanted: args.inclusions_wanted ?? [],
    budget_min: args.budget_min,
    budget_max: args.budget_max,
    budget_currency: args.budget_currency,
    flexibility: args.flexibility,
    preferred_currency: args.preferred_currency,
    customer_notes: args.notes,
    ota_comparison: args.ota_comparison,
  });
  if (!parsed.success) return toolError(`The request needs a few fixes:\n${describeIssues(parsed.error).join("\n")}`);

  const dest = await ctx.publicData.findDestination(parsed.data.destination);
  const result = await user.data.submitRequest(toIntakePayload({ ...parsed.data, destination_slug: dest?.slug }));
  if ("error" in result) return toolError(`The request could not be created: ${result.error}`);

  const summary = tripSummary({
    ...parsed.data,
    travel_month: parsed.data.travel_month ? `${parsed.data.travel_month}-01` : undefined,
  });
  const band =
    parsed.data.request_type === "package" && parsed.data.nights
      ? await ctx.publicData.band({
          destinationSlug: dest?.slug ?? null,
          month: parsed.data.travel_month ? Number(parsed.data.travel_month.slice(5, 7)) : parsed.data.start_date ? Number(parsed.data.start_date.slice(5, 7)) : null,
          tier: parsed.data.hotel_tier ?? null,
          nights: parsed.data.nights,
          adults: parsed.data.adults,
          children: parsed.data.children,
        })
      : null;
  ctx.background(ctx.notify.requestReceived(user, result.reference, summary, band));
  ctx.background(ctx.notify.staff("new_request", user, result.reference, summary));

  const accountUrl = `${ctx.appUrl}/account/quotes/${result.reference}`;
  const status = customerStatus({ status: "queued" });
  const lines = [
    `Quote request ${result.reference} is with Udan's pricing desk (${summary}).`,
    `Status: ${status.label}. ${inAccount(status.detail)}`,
  ];
  if (band) lines.push(`Similar trips have typically cost ${formatInr(band.low)} to ${formatInr(band.high)}. ${band.basis}`);
  lines.push(`A confirmation has been emailed to ${user.email}. The request is in the user's Udan account: ${accountUrl}`);
  return ok(lines.join("\n"), {
    reference: result.reference,
    status: "queued",
    account_url: accountUrl,
    confirmation_emailed_to: user.email,
    typical_band: band ? { low_inr: band.low, high_inr: band.high, sample_count: band.sampleCount, basis: band.basis } : null,
  });
}

export async function getQuote(ctx: ToolContext, args: Input<typeof referenceInput>): Promise<CallToolResult> {
  if (!ctx.user) return signInError("get_quote");
  const ref = normalizeReference(args.reference);
  if (!ref) return toolError(`"${args.reference}" is not a Udan quote reference. ${REFERENCE_HELP}`);
  const q = await ctx.user.data.quote(ref);
  if (!q) return toolError(`There is no quote ${ref} in the account signed in as ${ctx.user.email}. Check the reference in the confirmation email, or sign in with the email used for the request.`);

  const status = customerStatus({ status: q.status, acceptRequestedAt: q.accept_requested_at, acceptedAt: q.accepted_at, payments: q.payments });
  const rates = await ctx.publicData.rates();
  const display = q.total_inr != null ? displayPrice(Number(q.total_inr), q.preferred_currency, rates) : null;
  const totalDisplay = display ? (display.approxLabel ? `${display.inr} (${display.approxLabel})` : display.inr) : null;
  const trip = tripSummary(q);
  const accountUrl = `${ctx.appUrl}/account/quotes/${q.reference}`;
  const validUntil = q.valid_until ? new Date(q.valid_until).toISOString().slice(0, 10) : null;

  const lines = [`${q.reference}: ${trip}`, `Status: ${status.label}. ${inAccount(status.detail)}`];
  if (q.lines.length > 0) {
    lines.push(...q.lines.map((l) => `- ${l.description}: ${formatInr(Number(l.price_inr))}`));
    if (totalDisplay) lines.push(`Total: ${totalDisplay}`);
    if (validUntil) lines.push(q.is_expired ? `The price was valid until ${validUntil}; accepting now asks the desk to re-check it.` : `Price valid until ${validUntil}.`);
    if (q.inclusions) lines.push(`Included: ${q.inclusions.replace(/\s*\n\s*/g, "; ")}`);
    if (q.exclusions) lines.push(`Not included: ${q.exclusions.replace(/\s*\n\s*/g, "; ")}`);
  }
  const messages = q.messages ?? [];
  if (messages.length > 0) {
    lines.push("Messages from Udan's team:");
    lines.push(...messages.map((m) => `- ${m.from}, ${new Date(m.sent_at).toISOString().slice(0, 10)}: ${m.body.replace(/\s*\n\s*/g, " ")}`));
  }
  lines.push(`Account: ${accountUrl}`);

  return ok(lines.join("\n"), {
    reference: q.reference,
    status: q.status,
    status_label: status.label,
    status_detail: inAccount(status.detail),
    trip,
    total_inr: q.total_inr != null ? Number(q.total_inr) : null,
    total_display: totalDisplay,
    valid_until: validUntil,
    expired: q.is_expired,
    line_items: q.lines.map((l) => ({ type: l.type, description: l.description, price_inr: Number(l.price_inr) })),
    inclusions: q.inclusions,
    exclusions: q.exclusions,
    payments: q.payments.map((p) => ({ kind: p.kind, amount_inr: Number(p.amount), status: p.status })),
    messages: messages.map((m) => ({ from: m.from, sent_at: m.sent_at, text: m.body })),
    account_url: accountUrl,
  });
}

export async function confirmBooking(ctx: ToolContext, args: Input<typeof referenceInput>): Promise<CallToolResult> {
  if (!ctx.user) return signInError("confirm_booking");
  const user = ctx.user;
  const ref = normalizeReference(args.reference);
  if (!ref) return toolError(`"${args.reference}" is not a Udan quote reference. ${REFERENCE_HELP}`);
  const r = await user.data.accept(ref);
  const accountUrl = `${ctx.appUrl}/account/quotes/${ref}`;

  switch (r.result) {
    case "accepted": {
      ctx.background(ctx.notify.accepted(user, ref, r.total_inr ?? null));
      ctx.background(ctx.notify.staff("accepted", user, ref, ref));
      const message = `Quote ${ref} is accepted${r.total_inr != null ? ` at ${formatInr(Number(r.total_inr))}` : ""}. Its price and inclusions are now fixed and the status is "accepted, awaiting payment". Udan's team has been told and will email payment details (bank transfer, UPI or a card payment link). No payment was taken here.`;
      return ok(message, { reference: ref, result: "accepted", status: "awaiting_payment", message, account_url: accountUrl });
    }
    case "already_accepted": {
      const message = `Quote ${ref} was already accepted; its status is ${customerStatus({ status: (r.status ?? "awaiting_payment") as RequestStatus }).label.toLowerCase()}. Nothing was changed.`;
      return ok(message, { reference: ref, result: "already_accepted", status: r.status ?? "awaiting_payment", message, account_url: accountUrl });
    }
    case "recheck": {
      ctx.background(ctx.notify.staff("recheck", user, ref, ref));
      const message = `Quote ${ref} passed its validity date, so it was not accepted yet. Udan's team will re-check the prices with suppliers and email a confirmed quote to accept.`;
      return ok(message, { reference: ref, result: "recheck", status: "pricing", message, account_url: accountUrl });
    }
    case "not_ready":
      return toolError(`Quote ${ref} has not been priced yet, so there is nothing to accept. get_quote shows its current status.`);
    default:
      return toolError(`There is no quote ${ref} in the account signed in as ${user.email}. Check the reference in the confirmation email.`);
  }
}

export const HANDLERS = {
  get_indicative_price: getIndicativePrice,
  compare_price: comparePrice,
  request_quote: requestQuote,
  get_quote: getQuote,
  confirm_booking: confirmBooking,
} as const;
