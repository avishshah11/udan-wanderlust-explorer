import { type PaymentAsked, type RequestStatus, formatInr } from "@udan/core";

// Where a customer's trip stands, in steps, and the one thing to do next.
// Shared by the quote page and the list of quotes. Rule 1: never promise when
// anything will happen (the customer-copy test scans this file).

export const CUSTOMER_STEPS = ["Request received", "Quote ready", "Accepted", "Advance paid", "Fully paid"] as const;

export interface TripState {
  status: RequestStatus;
  accept_requested_at?: string | null;
  accepted_at?: string | null;
  valid_until?: string | null;
  payments?: readonly PaymentAsked[];
}

/** The step in progress (CUSTOMER_STEPS.length when everything is done). */
export function customerStep(t: TripState): number {
  switch (t.status) {
    case "queued":
    case "pricing":
      return 1;
    case "sent":
      return 2;
    case "awaiting_payment":
      return 3;
    case "advance_received":
      return 4;
    case "balance_received":
      return CUSTOMER_STEPS.length;
    case "cancelled":
      return 0;
  }
}

/** The payment the customer still has to make, if the desk has asked for one. */
export function waitingPayment(t: TripState): PaymentAsked | null {
  return (t.payments ?? []).filter((p) => p.status === "awaiting").at(-1) ?? null;
}

export function isExpired(t: TripState, now = new Date()): boolean {
  return t.status === "sent" && !!t.valid_until && new Date(t.valid_until) < now;
}

/** One short line for the list of quotes: what happens next. */
export function nextStepLine(t: TripState): string {
  const pay = waitingPayment(t);
  if (pay && (t.status === "awaiting_payment" || t.status === "advance_received")) {
    return `Next: pay your ${pay.kind === "balance" ? "balance" : "advance"} of ${formatInr(Number(pay.amount))}`;
  }
  switch (t.status) {
    case "queued":
      return "We are pricing your trip";
    case "pricing":
      return t.accept_requested_at && !t.accepted_at ? "We are re-checking the prices" : "We are pricing your trip";
    case "sent":
      return isExpired(t) ? "Price expired: ask us to re-check it" : "Next: look through your quote and accept it";
    case "awaiting_payment":
      return "Accepted. We will email you how to pay";
    case "advance_received":
      return "Advance received. We are making your bookings";
    case "balance_received":
      return "Fully paid. Your documents are on this page";
    case "cancelled":
      return "Cancelled";
  }
}
