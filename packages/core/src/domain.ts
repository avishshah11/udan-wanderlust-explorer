// Domain vocabulary shared by the app, the MCP server and the website. The
// string unions mirror the Postgres enums in supabase/migrations; the
// `satisfies` checks below fail to compile if the two drift apart.

import type { Database } from "./database.types";

type Enums = Database["public"]["Enums"];

export const REQUEST_CHANNELS = ["claude", "web", "email", "staff"] as const;
export const REQUEST_TYPES = ["package", "flights", "hotels"] as const;
export const CABIN_CLASSES = ["economy", "premium_economy", "business", "first"] as const;
export const REQUEST_STATUSES = [
  "queued",
  "pricing",
  "sent",
  "awaiting_payment",
  "advance_received",
  "balance_received",
  "cancelled",
] as const;
export const HOTEL_TIERS = ["3_star", "4_star", "5_star"] as const;
export const FLEXIBILITY = ["fixed", "few_days", "flexible"] as const;
export const LINE_TYPES = [
  "hotel",
  "flight",
  "transfer",
  "activity",
  "visa",
  "insurance",
  "package",
  "other",
] as const;
export const PAYMENT_KINDS = ["advance", "balance"] as const;
export const PAYMENT_METHODS = ["bank", "upi", "card_link", "cash"] as const;
export const PAYMENT_STATUSES = ["awaiting", "received"] as const;
export const DOCUMENT_TYPES = [
  "voucher",
  "ticket",
  "visa",
  "insurance",
  "invoice",
  "itinerary",
  "ota_screenshot",
  "other",
] as const;
export const INCLUSIONS = [
  "flights",
  "hotel",
  "transfers",
  "sightseeing",
  "meals",
  "visa",
  "insurance",
] as const;

export type RequestChannel = (typeof REQUEST_CHANNELS)[number];
export type RequestType = (typeof REQUEST_TYPES)[number];
export type CabinClass = (typeof CABIN_CLASSES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type HotelTier = (typeof HOTEL_TIERS)[number];
export type Flexibility = (typeof FLEXIBILITY)[number];
export type LineType = (typeof LINE_TYPES)[number];
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type Inclusion = (typeof INCLUSIONS)[number];

// Compile-time drift checks against the generated database types.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
true satisfies Same<RequestChannel, Enums["request_channel"]>;
true satisfies Same<RequestType, Enums["request_type"]>;
true satisfies Same<CabinClass, Enums["cabin_class"]>;
true satisfies Same<RequestStatus, Enums["request_status"]>;
true satisfies Same<HotelTier, Enums["hotel_tier"]>;
true satisfies Same<Flexibility, Enums["flexibility"]>;
true satisfies Same<LineType, Enums["line_type"]>;
true satisfies Same<PaymentKind, Enums["payment_kind"]>;
true satisfies Same<PaymentMethod, Enums["payment_method"]>;
true satisfies Same<PaymentStatus, Enums["payment_status"]>;
true satisfies Same<DocumentType, Enums["document_type"]>;

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  package: "Holiday package",
  flights: "Flights only",
  hotels: "Hotel only",
};

export const CABIN_CLASS_LABELS: Record<CabinClass, string> = {
  economy: "Economy",
  premium_economy: "Premium economy",
  business: "Business",
  first: "First",
};

export const HOTEL_TIER_LABELS: Record<HotelTier, string> = {
  "3_star": "3-star",
  "4_star": "4-star",
  "5_star": "5-star",
};

export const LINE_TYPE_LABELS: Record<LineType, string> = {
  hotel: "Hotel",
  flight: "Flight",
  transfer: "Transfer",
  activity: "Activity",
  visa: "Visa",
  insurance: "Insurance",
  package: "Package",
  other: "Other",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank: "Bank transfer",
  upi: "UPI",
  card_link: "Card payment link",
  cash: "Cash at our office",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  voucher: "Voucher",
  ticket: "Ticket",
  visa: "Visa",
  insurance: "Insurance",
  invoice: "Invoice",
  itinerary: "Itinerary",
  ota_screenshot: "Price screenshot you sent",
  other: "Document",
};

export const FLEXIBILITY_LABELS: Record<Flexibility, string> = {
  fixed: "Fixed dates",
  few_days: "A few days either way",
  flexible: "Flexible within the month",
};

export const INCLUSION_LABELS: Record<Inclusion, string> = {
  flights: "Flights",
  hotel: "Hotel",
  transfers: "Airport and local transfers",
  sightseeing: "Sightseeing",
  meals: "Meals",
  visa: "Visa",
  insurance: "Travel insurance",
};
