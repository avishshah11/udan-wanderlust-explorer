// Transactional emails. Rule 1 applies to every word here: no turnaround
// times, no "within", no ETA. The tests render each template and run it
// through findTurnaroundLanguage().

import { type DisplayPrice } from "../currency";
import {
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
  LINE_TYPE_LABELS,
  type LineType,
  type PaymentKind,
} from "../domain";
import { type Block, OFFICE, type RenderedEmail, button, heading, para, preformatted, renderEmail, rows } from "./layout";

const firstName = (name: string | null | undefined) => {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? `Dear ${first},` : "Hello,";
};

const priceText = (p: DisplayPrice) => (p.approxLabel ? `${p.inr} (${p.approxLabel})` : p.inr);

const dateText = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

// ---------------------------------------------------------------------------
// Customer emails
// ---------------------------------------------------------------------------

export function requestReceivedEmail(input: {
  name: string | null;
  reference: string;
  tripSummary: string; // e.g. "Bali, 5 nights, 2 adults, May 2027"
  accountUrl: string;
  /** The rate-card band for the party, when one exists (formatted INR, core bandBasis()). */
  typical?: { low: string; high: string; basis: string } | null;
}): RenderedEmail {
  return renderEmail(`We have your request ${input.reference}`, firstName(input.name), [
    para(`Thank you for asking us to price your trip. Your reference is ${input.reference}.`),
    rows([["Trip", input.tripSummary]]),
    ...(input.typical
      ? [heading("Typical price"), para(`Similar trips have typically cost ${input.typical.low} to ${input.typical.high}. ${input.typical.basis}`)]
      : []),
    para(
      "A member of our family will price it against our supplier rates. Your quote will appear in your Udan account and in this inbox, with everything it includes and how long the price holds.",
    ),
    button("Open your account", input.accountUrl),
    para("If anything about the trip changes, just reply to this email and quote your reference."),
  ]);
}

export interface EmailQuoteLine {
  type: LineType;
  description: string;
  price: string; // formatted INR
}

export function quoteReadyEmail(input: {
  name: string | null;
  reference: string;
  tripSummary: string;
  lines: readonly EmailQuoteLine[];
  total: DisplayPrice;
  validUntil: string;
  inclusions: string | null;
  exclusions: string | null;
  quoteUrl: string;
  revision: boolean;
}): RenderedEmail {
  const blocks: Block[] = [
    para(
      input.revision
        ? `Your revised quote for ${input.reference} is ready.`
        : `Your quote for ${input.reference} is ready.`,
    ),
    rows([["Trip", input.tripSummary]]),
    heading("Price"),
    rows([
      ...input.lines.map((l): [string, string] => [`${LINE_TYPE_LABELS[l.type]}: ${l.description}`, l.price]),
      ["Total", priceText(input.total)],
    ]),
  ];
  if (input.total.rateNote) blocks.push(para(input.total.rateNote));
  if (input.inclusions) blocks.push(heading("Included"), preformatted(input.inclusions));
  if (input.exclusions) blocks.push(heading("Not included"), preformatted(input.exclusions));
  blocks.push(
    para(`This price holds until ${dateText(input.validUntil)}. Supplier prices change, so after that date we re-check before confirming.`),
    button("Review and accept", input.quoteUrl),
    para("Want something changed? Reply to this email and we will re-price it under the same reference."),
  );
  return renderEmail(`Your quote ${input.reference} is ready`, firstName(input.name), blocks);
}

export function quoteAcceptedEmail(input: {
  name: string | null;
  reference: string;
  total: DisplayPrice;
  quoteUrl: string;
}): RenderedEmail {
  return renderEmail(`Thank you for confirming ${input.reference}`, firstName(input.name), [
    para(`You have accepted quote ${input.reference} for ${priceText(input.total)}. The price and inclusions are now fixed.`),
    para(
      "Payment details are on their way from our team in a separate email, by bank transfer or UPI, or a card payment link if you are paying from outside India. Your account shows the payment status at every step.",
    ),
    button("View your booking", input.quoteUrl),
  ]);
}

export type PaymentDetailsVariant = "bank" | "upi" | "card_link";

export function paymentDetailsEmail(input: {
  name: string | null;
  reference: string;
  kind: PaymentKind;
  amount: string; // formatted INR
  variant: PaymentDetailsVariant;
  instructions: string; // written or pasted by staff (bank account, UPI ID)
  cardLink?: string | null; // Razorpay dashboard payment link
  quoteUrl: string;
}): RenderedEmail {
  const what = input.kind === "advance" ? "advance payment" : "balance payment";
  const blocks: Block[] = [
    para(`Here are the details for the ${what} of ${input.amount} for ${input.reference}.`),
  ];
  if (input.variant === "card_link") {
    if (!input.cardLink) throw new Error("A card payment email needs the payment link.");
    blocks.push(
      para("You can pay by card using this secure payment link:"),
      button(`Pay ${input.amount} by card`, input.cardLink),
    );
    if (input.instructions.trim()) blocks.push(preformatted(input.instructions));
  } else {
    blocks.push(
      heading(input.variant === "bank" ? "Bank transfer" : "UPI"),
      preformatted(input.instructions),
      para(`Please put ${input.reference} in the payment reference so we can match it to your booking.`),
    );
  }
  const landline = OFFICE.phones.find((p) => p.label === "Office")!.display;
  blocks.push(
    heading("Before you pay"),
    para(
      `This payment is also shown in your Udan account under ${input.reference}. If the amount there is different, or anyone asks you to pay somewhere else, call our office on ${landline} before paying. We never ask for an OTP or a PIN.`,
    ),
    button("Check it in your account", input.quoteUrl),
    para("Once the payment reaches us, we will confirm by email and your account will show it as received."),
  );
  return renderEmail(`Payment details for ${input.reference}`, firstName(input.name), blocks);
}

export function paymentReceivedEmail(input: {
  name: string | null;
  reference: string;
  kind: PaymentKind;
  amount: string;
  quoteUrl: string;
}): RenderedEmail {
  const advance = input.kind === "advance";
  return renderEmail(
    advance ? `Advance received for ${input.reference}` : `Payment complete for ${input.reference}`,
    firstName(input.name),
    [
      para(
        advance
          ? `We have received your advance of ${input.amount}. We are now making your bookings, and your vouchers and tickets will appear in your account and in this inbox.`
          : `We have received your balance payment of ${input.amount}. Your trip is fully paid. Thank you.`,
      ),
      button("View your booking", input.quoteUrl),
    ],
  );
}

export function documentsReadyEmail(input: {
  name: string | null;
  reference: string;
  documents: readonly { type: DocumentType; fileName: string }[];
  quoteUrl: string;
}): RenderedEmail {
  return renderEmail(`Your travel documents for ${input.reference}`, firstName(input.name), [
    para("Your travel documents are ready in your Udan account:"),
    rows(input.documents.map((d): [string, string] => [DOCUMENT_TYPE_LABELS[d.type], d.fileName])),
    button("Download your documents", input.quoteUrl),
    para("Please check names and dates against your passports, and reply to this email if anything looks wrong."),
  ]);
}

/**
 * A message typed by a family member on the desk. The text is theirs, shown
 * as written (escaped); the customer answers by replying to the email.
 */
export function deskMessageEmail(input: {
  name: string | null;
  reference: string;
  from: string; // staff member's name
  message: string;
  quoteUrl: string;
}): RenderedEmail {
  return renderEmail(`A message about your request ${input.reference}`, firstName(input.name), [
    para(`${input.from} from Udan Tours and Travels has written to you about ${input.reference}:`),
    preformatted(input.message),
    button("Open your request", input.quoteUrl),
    para("Reply to this email to answer. Your request and this message are also in your Udan account."),
  ]);
}

// ---------------------------------------------------------------------------
// Staff alerts (internal; may mention timing, but they don't need to)
// ---------------------------------------------------------------------------

export type StaffAlertEvent = "new_request" | "accepted" | "recheck";

export function staffAlertEmail(input: {
  event: StaffAlertEvent;
  reference: string;
  customer: string; // name and email
  tripSummary: string;
  channel: string;
  deskUrl: string;
}): RenderedEmail {
  const title = {
    new_request: `New request ${input.reference} (${input.channel})`,
    accepted: `ACCEPTED ${input.reference}: send payment details`,
    recheck: `Re-check ${input.reference}: customer wants to accept an expired quote`,
  }[input.event];
  const action = {
    new_request: "A new quote request is in the queue.",
    accepted: "The customer has accepted. The quote is frozen and shows 'awaiting payment'. Send the payment details from the desk.",
    recheck: "The customer tried to accept after the validity date. Re-check supplier prices and send a fresh quote.",
  }[input.event];
  return renderEmail(title, "Hello,", [
    para(action),
    rows([
      ["Customer", input.customer],
      ["Trip", input.tripSummary],
      ["Channel", input.channel],
    ]),
    button("Open on the desk", input.deskUrl),
  ]);
}
