// The structured quote request every channel produces: the website form,
// the Claude connector (request_quote) and the desk's phone/WhatsApp entry.
// Messages are written for the person filling the form or for Claude to
// relay, so each one says what to fix.
//
// Three kinds of request share one shape (request_type):
//   package  destination, start date or month, nights
//   flights  origin_city -> destination, start_date = departure,
//            end_date = return (leave out for one way), cabin_class
//   hotels   destination = city or area, start_date = check-in,
//            end_date = check-out (nights are worked out), rooms

import { z } from "zod";
import { DISPLAY_CURRENCIES } from "./currency";
import { CABIN_CLASSES, FLEXIBILITY, HOTEL_TIERS, INCLUSIONS, LINE_TYPES, REQUEST_TYPES } from "./domain";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Use a date in the form YYYY-MM-DD." })
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), { error: "That date does not exist." });

const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Use a month in the form YYYY-MM." });

const currency = z.enum(DISPLAY_CURRENCIES, {
  error: `Currency must be one of ${DISPLAY_CURRENCIES.join(", ")}.`,
});

const money = z.number({ error: "Enter an amount as a number." }).nonnegative().max(1e9);

export const requestedItemSchema = z.object({
  type: z.enum(LINE_TYPES, { error: `Item type must be one of ${LINE_TYPES.join(", ")}.` }),
  description: z.string().trim().min(2, { error: "Describe each item in a few words." }).max(300),
  city: z.string().trim().max(100).optional(),
  start_date: isoDate.optional(),
  nights: z.int().min(1).max(90).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const otaComparisonSchema = z.object({
  ota_name: z.string().trim().min(2, { error: "Say which site the price is from." }).max(100),
  product_name: z.string().trim().min(2, { error: "Give the hotel or package name." }).max(300),
  room_type: z.string().trim().max(200).optional(),
  check_in: isoDate.optional(),
  check_out: isoDate.optional(),
  adults: z.int().min(1).max(50).optional(),
  children: z.int().min(0).max(20).optional(),
  price: money.positive({ error: "The OTA price must be more than zero." }),
  currency: currency.default("INR"),
});

export const quoteRequestSchema = z
  .object({
    request_type: z.enum(REQUEST_TYPES, { error: `Request type must be one of ${REQUEST_TYPES.join(", ")}.` }).default("package"),
    destination: z.string().trim().min(2, { error: "Tell us where you want to go." }).max(200),
    destination_slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).optional(),
    origin_city: z.string().trim().max(100).optional(),
    start_date: isoDate.optional(),
    end_date: isoDate.optional(),
    /** Flights from a form: "return" needs end_date; "one_way" drops it. */
    trip_way: z.enum(["one_way", "return"]).optional(),
    travel_month: isoMonth.optional(),
    nights: z
      .int({ error: "Give the number of nights as a whole number." })
      .min(1, { error: "A trip needs at least one night." })
      .max(90, { error: "For trips longer than 90 nights, please call or email us." })
      .optional(),
    adults: z.int().min(1, { error: "At least one adult is travelling." }).max(50).default(2),
    children: z.int().min(0).max(20).default(0),
    child_ages: z.array(z.int().min(0).max(17)).max(20).default([]),
    rooms: z.int({ error: "Give the number of rooms as a whole number." }).min(1, { error: "At least one room." }).max(20, {
      error: "For more than 20 rooms, please call or email us.",
    }).optional(),
    hotel_tier: z.enum(HOTEL_TIERS).optional(),
    cabin_class: z.enum(CABIN_CLASSES, { error: `Cabin class must be one of ${CABIN_CLASSES.join(", ")}.` }).optional(),
    budget_min: money.optional(),
    budget_max: money.optional(),
    budget_currency: currency.default("INR"),
    flexibility: z.enum(FLEXIBILITY).default("fixed"),
    inclusions_wanted: z.array(z.enum(INCLUSIONS)).max(INCLUSIONS.length).default([]),
    requested_items: z.array(requestedItemSchema).max(30).default([]),
    ota_comparison: otaComparisonSchema.optional(),
    customer_notes: z.string().trim().max(4000).optional(),
    preferred_currency: currency.default("INR"),
    time_zone: z.string().max(64).optional(),
    country: z
      .string()
      .regex(/^[A-Za-z]{2}$/)
      .transform((s) => s.toUpperCase())
      .optional(),
  })
  .superRefine((r, ctx) => {
    if (r.request_type === "flights") {
      if (!r.origin_city || r.origin_city.length < 2) {
        ctx.addIssue({ code: "custom", path: ["origin_city"], message: "Tell us the city you fly from." });
      }
      if (!r.start_date) ctx.addIssue({ code: "custom", path: ["start_date"], message: "Give the departure date." });
      if (r.trip_way === "return" && !r.end_date) {
        ctx.addIssue({ code: "custom", path: ["end_date"], message: "Give the return date, or choose one way." });
      }
      if (r.trip_way !== "one_way" && r.start_date && r.end_date && r.end_date < r.start_date) {
        ctx.addIssue({ code: "custom", path: ["end_date"], message: "The return date is before the departure date." });
      }
    } else if (r.request_type === "hotels") {
      if (!r.start_date) ctx.addIssue({ code: "custom", path: ["start_date"], message: "Give the check-in date." });
      if (!r.end_date) ctx.addIssue({ code: "custom", path: ["end_date"], message: "Give the check-out date." });
      if (r.start_date && r.end_date) {
        const nights = daysBetween(r.start_date, r.end_date);
        if (nights < 1) {
          ctx.addIssue({ code: "custom", path: ["end_date"], message: "The check-out date must be after the check-in date." });
        } else if (nights > 90) {
          ctx.addIssue({ code: "custom", path: ["end_date"], message: "For stays longer than 90 nights, please call or email us." });
        }
      }
    } else {
      if (!r.start_date && !r.travel_month) {
        ctx.addIssue({ code: "custom", path: ["start_date"], message: "Give a start date or at least the month you want to travel." });
      }
      if (r.nights === undefined) ctx.addIssue({ code: "custom", path: ["nights"], message: "Give the number of nights." });
    }
    const today = todayInIndia();
    if (r.start_date && r.start_date < today) {
      ctx.addIssue({ code: "custom", path: ["start_date"], message: "The start date is in the past." });
    } else if (!r.start_date && r.travel_month && r.travel_month < today.slice(0, 7)) {
      ctx.addIssue({ code: "custom", path: ["travel_month"], message: "The travel month is in the past." });
    }
    if (r.budget_min !== undefined && r.budget_max !== undefined && r.budget_max < r.budget_min) {
      ctx.addIssue({ code: "custom", path: ["budget_max"], message: "The top of the budget is lower than the bottom." });
    }
    if (r.child_ages.length > 0 && r.child_ages.length !== r.children) {
      ctx.addIssue({ code: "custom", path: ["child_ages"], message: "Give one age for each child, or leave ages out." });
    }
  })
  // Keep only the fields each type uses, so every channel stores the same thing.
  .transform(({ trip_way, ...r }) => {
    if (r.request_type === "flights") {
      return { ...r, end_date: trip_way === "one_way" ? undefined : r.end_date, nights: undefined, rooms: undefined, travel_month: undefined };
    }
    if (r.request_type === "hotels") {
      return { ...r, nights: r.start_date && r.end_date ? daysBetween(r.start_date, r.end_date) : r.nights, travel_month: undefined, cabin_class: undefined };
    }
    return { ...r, end_date: undefined, cabin_class: undefined };
  });

export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;
export type QuoteRequest = z.output<typeof quoteRequestSchema>;

/** Whole days from one YYYY-MM-DD date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Today's date in India (YYYY-MM-DD), the desk's calendar. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** Payload for the intake functions (intake_quote_request / submit_quote_request). */
export function toIntakePayload(r: QuoteRequest): Record<string, unknown> {
  return {
    ...r,
    travel_month: r.start_date ? undefined : r.travel_month ? `${r.travel_month}-01` : undefined,
    child_ages: r.child_ages.length > 0 ? r.child_ages : undefined,
  };
}

/** One readable line per problem, for form errors and tool error messages. */
export function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const field = issue.path.join(".");
    return field ? `${field}: ${issue.message}` : issue.message;
  });
}
