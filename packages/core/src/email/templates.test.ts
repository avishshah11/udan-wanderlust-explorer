import { describe, expect, it, vi } from "vitest";
import { findTurnaroundLanguage } from "../copy-guard";
import { type DisplayPrice, displayPrice } from "../currency";
import { escapeHtml } from "./layout";
import { notifyCustomer, sendEmail } from "./send";
import {
  deskMessageEmail,
  documentsReadyEmail,
  paymentDetailsEmail,
  paymentReceivedEmail,
  quoteAcceptedEmail,
  quoteReadyEmail,
  requestReceivedEmail,
  staffAlertEmail,
} from "./templates";

const total: DisplayPrice = displayPrice(102525, "AED", [{ currency: "AED", inrPerUnit: 25.9358, rateDate: "2026-11-06" }]);
const url = "https://app.udantravelsbdq.com/account/quotes/UDN-2611-K7QMX";

const customerEmails = {
  requestReceived: requestReceivedEmail({ name: "Asha Example", reference: "UDN-2611-K7QMX", tripSummary: "Bali, 5 nights, 2 adults", accountUrl: url }),
  quoteReady: quoteReadyEmail({
    name: "Asha",
    reference: "UDN-2611-K7QMX",
    tripSummary: "Bali, 5 nights, 2 adults",
    lines: [{ type: "hotel", description: "Ubud, 3 nights", price: "₹47,040" }],
    total,
    validUntil: "2026-11-25T18:29:59Z",
    inclusions: "Hotels with breakfast\nPrivate transfers",
    exclusions: "Flights",
    quoteUrl: url,
    revision: false,
  }),
  quoteAccepted: quoteAcceptedEmail({ name: null, reference: "UDN-2611-K7QMX", total, quoteUrl: url }),
  paymentBank: paymentDetailsEmail({ name: "Asha", reference: "UDN-2611-K7QMX", kind: "advance", amount: "₹30,000", variant: "bank", instructions: "Account name: Example\nIFSC: TEST0000000", quoteUrl: url }),
  paymentUpi: paymentDetailsEmail({ name: "Asha", reference: "UDN-2611-K7QMX", kind: "advance", amount: "₹30,000", variant: "upi", instructions: "UPI ID: example@upi", quoteUrl: url }),
  paymentCard: paymentDetailsEmail({ name: "Asha", reference: "UDN-2611-K7QMX", kind: "balance", amount: "₹72,525", variant: "card_link", instructions: "", cardLink: "https://example.test/pay", quoteUrl: url }),
  advanceReceived: paymentReceivedEmail({ name: "Asha", reference: "UDN-2611-K7QMX", kind: "advance", amount: "₹30,000", quoteUrl: url }),
  balanceReceived: paymentReceivedEmail({ name: "Asha", reference: "UDN-2611-K7QMX", kind: "balance", amount: "₹72,525", quoteUrl: url }),
  documentsReady: documentsReadyEmail({ name: "Asha", reference: "UDN-2611-K7QMX", documents: [{ type: "voucher", fileName: "hotel.pdf" }], quoteUrl: url }),
  deskMessage: deskMessageEmail({ name: "Asha", reference: "UDN-2611-K7QMX", from: "Meera", message: "Would you like a sea-view room?\nIt is ₹2,000 more a night.", quoteUrl: url }),
};

describe("customer emails", () => {
  it.each(Object.entries(customerEmails))("%s promises no turnaround time (rule 1)", (_name, email) => {
    expect(findTurnaroundLanguage(email.subject)).toEqual([]);
    expect(findTurnaroundLanguage(email.text)).toEqual([]);
  });

  it.each(Object.entries(customerEmails))("%s carries the reference and the office details", (_name, email) => {
    expect(email.subject).toContain("UDN-2611-K7QMX");
    expect(email.text).toContain("Established 1997");
    expect(email.html).toContain("tel:+919376214442");
  });

  it("quote email shows INR first with the approximate local amount and rate note", () => {
    const { text } = customerEmails.quoteReady;
    expect(text).toMatch(/Total: ₹1,02,525 \(approx\. AED\s?3,953\)/);
    expect(text).toContain("You pay in INR");
    expect(text).toContain("This price holds until 25 November 2026");
  });

  it("card-link email needs a link", () => {
    expect(() =>
      paymentDetailsEmail({ name: null, reference: "R", kind: "advance", amount: "₹1", variant: "card_link", instructions: "", quoteUrl: url }),
    ).toThrow(/payment link/);
  });

  it("payment details tell the customer to check the account before paying", () => {
    for (const email of [customerEmails.paymentBank, customerEmails.paymentUpi, customerEmails.paymentCard]) {
      expect(email.text).toContain("This payment is also shown in your Udan account under UDN-2611-K7QMX.");
      expect(email.text).toContain("call our office on 0265 400 8999 before paying");
      expect(email.text).toContain("We never ask for an OTP or a PIN.");
      expect(email.html).toContain(url);
    }
  });

  it("escapes anything people typed", () => {
    const email = paymentDetailsEmail({
      name: "<script>x</script>",
      reference: "UDN-2611-K7QMX",
      kind: "advance",
      amount: "₹1",
      variant: "bank",
      instructions: '<img src=x onerror="alert(1)">',
      quoteUrl: url,
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain(escapeHtml('<img src=x onerror="alert(1)">'));
  });
});

describe("staff alerts", () => {
  it("say what to do", () => {
    const email = staffAlertEmail({ event: "accepted", reference: "UDN-2611-K7QMX", customer: "Asha <a@example.com>", tripSummary: "Bali", channel: "claude", deskUrl: "https://app/desk" });
    expect(email.subject).toBe("ACCEPTED UDN-2611-K7QMX: send payment details");
    expect(email.text).toContain("Send the payment details from the desk.");
  });
});

describe("delivery", () => {
  it("skips sending without an API key", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const r = await sendEmail({ apiKey: undefined, from: "x" }, "a@example.com", customerEmails.quoteAccepted);
    expect(r).toMatchObject({ ok: false, skipped: true });
    info.mockRestore();
  });

  it("posts to Resend and reports errors", async () => {
    const fetchOk = vi.fn(async () => new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
    expect(await sendEmail({ apiKey: "k", from: "f", fetch: fetchOk }, "a@example.com", customerEmails.quoteAccepted)).toEqual({ channel: "email", ok: true, id: "em_1" });
    const body = JSON.parse((fetchOk.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.to).toEqual(["a@example.com"]);
    const fetchBad = vi.fn(async () => new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 }));
    expect(await sendEmail({ apiKey: "k", from: "f", fetch: fetchBad }, "a@example.com", customerEmails.quoteAccepted)).toMatchObject({ ok: false, error: "domain not verified" });
  });

  it("only attempts WhatsApp/SMS when opted in, and reports them as not connected", async () => {
    const fetchOk = vi.fn(async () => new Response("{}", { status: 200 }));
    const results = await notifyCustomer(
      { apiKey: "k", from: "f", fetch: fetchOk },
      { email: "a@example.com", phone: "+971500000000", alertWhatsapp: true, alertSms: false },
      customerEmails.quoteReady,
    );
    expect(results.map((r) => [r.channel, r.ok, r.skipped ?? false])).toEqual([
      ["email", true, false],
      ["whatsapp", false, true],
    ]);
  });
});

describe("deskMessageEmail", () => {
  it("shows the family member's words as written, escaped, with line breaks", () => {
    const email = deskMessageEmail({ name: "Asha", reference: "UDN-2611-K7QMX", from: "Meera", message: "Line one <b>bold?</b>\nLine two", quoteUrl: url });
    expect(email.subject).toBe("A message about your request UDN-2611-K7QMX");
    expect(email.html).toContain("Line one &lt;b&gt;bold?&lt;/b&gt;<br>Line two");
    expect(email.text).toContain("Meera from Udan Tours and Travels has written to you about UDN-2611-K7QMX:");
    expect(email.text).toContain("Line one <b>bold?</b>\nLine two");
  });
});
