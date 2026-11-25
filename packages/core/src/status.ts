// What a customer sees for each request status, in the account, in emails
// and in Claude. Rule 1 of the build: no turnaround time, ever. These strings
// are checked by findTurnaroundLanguage() in the tests.

import { formatInr } from "./currency";
import type { PaymentKind, PaymentStatus, RequestStatus } from "./domain";

export interface CustomerStatus {
  label: string;
  detail: string;
}

export const CUSTOMER_STATUS: Record<RequestStatus, CustomerStatus> = {
  queued: {
    label: "Request received",
    detail:
      "We have your request. A member of our team will price it against our supplier rates, and your quote will appear here and in your inbox.",
  },
  pricing: {
    label: "Being priced",
    detail:
      "We are checking prices with our suppliers. Your quote will appear here and in your inbox.",
  },
  sent: {
    label: "Quote ready",
    detail: "Your quote is ready. Look through it and accept it here while it is valid.",
  },
  awaiting_payment: {
    label: "Accepted, awaiting payment",
    detail:
      "Thank you for confirming. Payment details are on their way to your email. Once your advance reaches us, this page will show it.",
  },
  advance_received: {
    label: "Advance received",
    detail:
      "Your advance has reached us and we are making your bookings. Vouchers and tickets will appear here and in your inbox.",
  },
  balance_received: {
    label: "Paid in full",
    detail: "Thank you. Your trip is fully paid. Your travel documents are below.",
  },
  cancelled: {
    label: "Cancelled",
    detail: "This request has been cancelled. Reply to any of our emails if you would like to start again.",
  },
};

/** The customer tried to accept after the validity date; the desk is re-checking. */
export const RECHECK_STATUS: CustomerStatus = {
  label: "Re-checking prices",
  detail:
    "This quote passed its validity date, so we are confirming the prices with our suppliers again. We will email you the confirmed quote to accept.",
};

/** A payment the desk has asked for, as the customer's account sees it. */
export interface PaymentAsked {
  kind: PaymentKind;
  amount: number | string;
  status: PaymentStatus;
}

/**
 * After the desk emails payment details: the advance (or the balance) is
 * named with its amount, instead of "payment details are on their way".
 */
export function paymentDetailsSentStatus(payment: PaymentAsked): CustomerStatus {
  const amount = formatInr(Number(payment.amount));
  if (payment.kind === "balance") {
    return {
      label: "Balance details sent",
      detail: `We have emailed you how to pay the balance of ${amount}; it is also listed under Payments below. Once it reaches us, this page will show it. Vouchers and tickets will appear here and in your inbox.`,
    };
  }
  return {
    label: "Payment details sent",
    detail: `We have emailed you how to pay your advance of ${amount}; it is also listed under Payments below. Once it reaches us, this page will show it.`,
  };
}

export function customerStatus(input: {
  status: RequestStatus;
  acceptRequestedAt?: string | null;
  acceptedAt?: string | null;
  /** Payments asked for on this request, oldest first. */
  payments?: readonly PaymentAsked[];
}): CustomerStatus {
  if (input.status === "pricing" && input.acceptRequestedAt && !input.acceptedAt) return RECHECK_STATUS;
  if (input.status === "awaiting_payment" || input.status === "advance_received") {
    const waiting = (input.payments ?? []).filter((p) => p.status === "awaiting");
    const latest = waiting.at(-1);
    if (latest && (input.status === "awaiting_payment" || latest.kind === "balance")) return paymentDetailsSentStatus(latest);
  }
  return CUSTOMER_STATUS[input.status];
}

/** Statuses at which the customer has accepted. */
export const ACCEPTED_STATUSES: readonly RequestStatus[] = [
  "awaiting_payment",
  "advance_received",
  "balance_received",
];

/** Statuses that sit in the desk queue. */
export const OPEN_QUEUE_STATUSES: readonly RequestStatus[] = ["queued", "pricing"];
