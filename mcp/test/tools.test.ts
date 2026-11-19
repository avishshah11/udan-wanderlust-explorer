import { findTurnaroundLanguage } from "@udan/core";
import { describe, expect, it } from "vitest";
import { HANDLERS, SIGN_IN_REQUIRED, TOOL_DEFINITIONS, comparePrice, confirmBooking, getIndicativePrice, getQuote, requestQuote } from "../src/tools";
import { context, fakeUser, sentQuote, publicData } from "./fakes";

const text = (r: { content: { type: string; text?: string }[] }) => r.content.map((c) => c.text ?? "").join("\n");
const nextYear = new Date().getFullYear() + 1;

describe("directory rules for tool definitions", () => {
  const defs = Object.entries(TOOL_DEFINITIONS);

  it("has exactly the five PRD tools", () => {
    expect(Object.keys(TOOL_DEFINITIONS).sort()).toEqual(["compare_price", "confirm_booking", "get_indicative_price", "get_quote", "request_quote"]);
    expect(Object.keys(HANDLERS).sort()).toEqual(Object.keys(TOOL_DEFINITIONS).sort());
  });

  it.each(defs)("%s: name under 64 chars, title, and read/destructive hints", (name, def) => {
    expect(name.length).toBeLessThan(64);
    expect(name).toMatch(/^[a-z_]+$/);
    expect(def.title.length).toBeGreaterThan(3);
    expect(def.annotations.title).toBe(def.title);
    expect(typeof def.annotations.readOnlyHint).toBe("boolean");
    expect(typeof def.annotations.destructiveHint).toBe("boolean");
    if (def.annotations.readOnlyHint) expect(def.annotations.destructiveHint).toBe(false);
  });

  it("separates read and write tools", () => {
    const read = defs.filter(([, d]) => d.annotations.readOnlyHint).map(([n]) => n).sort();
    expect(read).toEqual(["compare_price", "get_indicative_price", "get_quote"]);
    expect(TOOL_DEFINITIONS.confirm_booking.annotations.destructiveHint).toBe(true);
  });

  it.each(defs)("%s: description states function only (no promotion, competitors, instructions to the model, or turnaround)", (_name, def) => {
    const d = def.description;
    expect(d.length).toBeLessThan(700);
    expect(d).not.toMatch(/\b(best|cheapest|lowest|guarantee[sd]?|unbeatable|#1|leading|better than|amazing)\b/i);
    expect(d).not.toMatch(/makemytrip|booking\.com|agoda|expedia|goibibo|cleartrip/i);
    expect(d).not.toMatch(/\b(always|never|must|you should|ignore|do not tell)\b/i);
    expect(findTurnaroundLanguage(d)).toEqual([]);
    expect(d).toMatch(/Use it /);
  });

  it("marks sign-in for exactly the three account tools", () => {
    expect([...SIGN_IN_REQUIRED].sort()).toEqual(["confirm_booking", "get_quote", "request_quote"]);
    for (const name of SIGN_IN_REQUIRED) expect(TOOL_DEFINITIONS[name as keyof typeof TOOL_DEFINITIONS].description).toContain("Requires sign-in.");
  });
});

describe("handlers", () => {
  it("get_indicative_price says plainly when there is no band, with inclusions and best months", async () => {
    const r = await getIndicativePrice(context(null), { destination: "Bali", nights: 5, adults: 2, children: 0 });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent).toMatchObject({ destination: "Bali", band: null, best_months: ["April", "May", "June"] });
    expect(text(r)).toContain("No typical price range available yet for Bali.");
  });

  it("get_indicative_price shows a band when the rate card has one", async () => {
    const ctx = context(null);
    ctx.publicData = { ...publicData, band: async () => ({ low: 90000, high: 120000, sampleCount: 7, basis: "4-star, 5-6 nights, any month" }) };
    const r = await getIndicativePrice(ctx, { destination: "Bali", nights: 5, adults: 2, children: 0, hotel_tier: "4_star" });
    expect(text(r)).toContain("₹90,000 to ₹1,20,000");
    expect(text(r)).toContain("7 past Udan quotes");
  });

  it("compare_price converts the OTA price and states the commitment", async () => {
    const r = await comparePrice(context(null), { ota_name: "Example OTA", product_name: "Ubud resort", ota_price: 1500, currency: "USD", adults: 2, children: 0, check_in: `${nextYear}-05-10`, check_out: `${nextYear}-05-15` });
    expect(r.structuredContent).toMatchObject({ ota_price_inr: 142874, udan_band: null, delta_inr: null });
    expect(text(r)).toContain("If Udan cannot offer it for less than this price, the quote says so plainly.");
  });

  it("compare_price rejects impossible dates", async () => {
    const r = await comparePrice(context(null), { ota_name: "X site", product_name: "Hotel", ota_price: 100, currency: "INR", adults: 2, children: 0, check_in: `${nextYear}-05-10`, check_out: `${nextYear}-05-09` });
    expect(r.isError).toBe(true);
  });

  it.each(["request_quote", "get_quote", "confirm_booking"] as const)("%s without sign-in explains how to sign in", async (name) => {
    const r = await HANDLERS[name](context(null), { reference: "UDN-2611-K7QMX", destination: "Bali", nights: 5, adults: 2, children: 0, budget_currency: "INR", flexibility: "fixed", preferred_currency: "INR" } as never);
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("needs the user to be signed in to Udan");
  });

  it("request_quote returns the reference and queues the emails", async () => {
    const background: Promise<unknown>[] = [];
    const r = await requestQuote(context(fakeUser(), background), {
      request_type: "package",
      destination: "Bali",
      travel_month: `${nextYear}-05`,
      nights: 5,
      adults: 2,
      children: 0,
      budget_currency: "INR",
      flexibility: "fixed",
      preferred_currency: "AED",
      items: [{ type: "hotel", description: "Ubud, 3 nights" }],
    });
    expect(r.structuredContent).toMatchObject({ reference: "UDN-2611-NEWRF", status: "queued", confirmation_emailed_to: "asha@example.com" });
    expect(background).toHaveLength(2);
  });

  it("request_quote passes validation problems back in words", async () => {
    const r = await requestQuote(context(fakeUser()), { request_type: "package", destination: "Goa", start_date: "2020-01-01", nights: 3, adults: 2, children: 2, child_ages: [4], budget_currency: "INR", flexibility: "fixed", preferred_currency: "INR" });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("start_date: The start date is in the past.");
    expect(text(r)).toContain("child_ages: Give one age for each child");
  });

  it("request_quote takes a return flight and a hotel stay", async () => {
    const submitted: Record<string, unknown>[] = [];
    const user = fakeUser({
      submitRequest: async (payload) => {
        submitted.push(payload);
        return { reference: "UDN-2611-NEWRF" };
      },
    });
    const flight = await requestQuote(context(user), {
      request_type: "flights",
      origin_city: "Vadodara",
      destination: "Dubai",
      start_date: `${nextYear}-05-10`,
      end_date: `${nextYear}-05-17`,
      cabin_class: "economy",
      adults: 2,
      children: 0,
      budget_currency: "INR",
      flexibility: "fixed",
      preferred_currency: "INR",
    });
    expect(text(flight)).toContain(`Flights from Vadodara to Dubai, return, 2 adults, economy`);
    const hotel = await requestQuote(context(user), {
      request_type: "hotels",
      destination: "Goa",
      start_date: `${nextYear}-01-10`,
      end_date: `${nextYear}-01-13`,
      rooms: 1,
      adults: 2,
      children: 0,
      budget_currency: "INR",
      flexibility: "fixed",
      preferred_currency: "INR",
    });
    expect(text(hotel)).toContain("Hotel in Goa, 3 nights, 1 room, 2 adults");
    expect(submitted.map((p) => p.request_type)).toEqual(["flights", "hotels"]);
    expect(submitted[1]).toMatchObject({ nights: 3, rooms: 1 });
  });

  it("request_quote asks a flight for the city it leaves from", async () => {
    const r = await requestQuote(context(fakeUser()), {
      request_type: "flights",
      destination: "Dubai",
      start_date: `${nextYear}-05-10`,
      adults: 1,
      children: 0,
      budget_currency: "INR",
      flexibility: "fixed",
      preferred_currency: "INR",
    });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain("origin_city: Tell us the city you fly from.");
  });

  it("get_quote returns prices, validity and the approximate local amount", async () => {
    const r = await getQuote(context(fakeUser()), { reference: "udn 2611 k7qmx" });
    expect(r.structuredContent).toMatchObject({ reference: "UDN-2611-K7QMX", status: "sent", status_label: "Quote ready", total_inr: 102525, valid_until: "2027-01-10" });
    expect(text(r)).toMatch(/Total: ₹1,02,525 \(approx\. AED\s?3,953\)/);
  });

  it("get_quote includes messages from the desk", async () => {
    const withMessage = { ...sentQuote, messages: [{ body: "Would you like a sea-view room?\nIt is a little more.", sent_at: "2026-11-19T05:00:00Z", from: "Meera" }] };
    const r = await getQuote(context(fakeUser({ quote: async () => withMessage })), { reference: "UDN-2611-K7QMX" });
    expect(text(r)).toContain("Messages from Udan's team:\n- Meera, 2026-11-19: Would you like a sea-view room? It is a little more.");
    expect(r.structuredContent).toMatchObject({ messages: [{ from: "Meera", text: "Would you like a sea-view room?\nIt is a little more." }] });
  });

  it("get_quote explains bad and unknown references", async () => {
    expect(text(await getQuote(context(fakeUser()), { reference: "12345" }))).toContain("Quote references look like UDN-2611-K7QMX");
    expect(text(await getQuote(context(fakeUser()), { reference: "UDN-2611-ZZZZZ" }))).toContain("There is no quote UDN-2611-ZZZZZ in the account signed in as asha@example.com");
  });

  it("confirm_booking: accepted, already accepted, re-check, not ready", async () => {
    const accepted = await confirmBooking(context(fakeUser()), { reference: "UDN-2611-K7QMX" });
    expect(accepted.structuredContent).toMatchObject({ result: "accepted", status: "awaiting_payment" });
    expect(text(accepted)).toContain("No payment was taken here.");
    const again = await confirmBooking(context(fakeUser({ accept: async () => ({ result: "already_accepted", status: "advance_received" }) })), { reference: "UDN-2611-K7QMX" });
    expect(text(again)).toContain("already accepted; its status is advance received");
    const recheck = await confirmBooking(context(fakeUser({ accept: async () => ({ result: "recheck" }) })), { reference: "UDN-2611-K7QMX" });
    expect(recheck.structuredContent).toMatchObject({ result: "recheck", status: "pricing" });
    const notReady = await confirmBooking(context(fakeUser({ accept: async () => ({ result: "not_ready" }) })), { reference: "UDN-2611-K7QMX" });
    expect(notReady.isError).toBe(true);
  });

  it("no response ever states a turnaround time (rule 1)", async () => {
    const results = [
      await getIndicativePrice(context(null), { destination: "Bali", nights: 5, adults: 2, children: 0 }),
      await comparePrice(context(null), { ota_name: "X site", product_name: "Hotel", ota_price: 1000, currency: "INR", adults: 2, children: 0 }),
      await requestQuote(context(fakeUser()), { request_type: "package", destination: "Bali", travel_month: `${nextYear}-05`, nights: 5, adults: 2, children: 0, budget_currency: "INR", flexibility: "fixed", preferred_currency: "INR" }),
      await getQuote(context(fakeUser()), { reference: "UDN-2611-K7QMX" }),
      await confirmBooking(context(fakeUser()), { reference: "UDN-2611-K7QMX" }),
      await confirmBooking(context(fakeUser({ accept: async () => ({ result: "recheck" }) })), { reference: "UDN-2611-K7QMX" }),
    ];
    for (const r of results) {
      expect(findTurnaroundLanguage(text(r))).toEqual([]);
      expect(findTurnaroundLanguage(JSON.stringify(r.structuredContent ?? {}))).toEqual([]);
    }
  });
});
