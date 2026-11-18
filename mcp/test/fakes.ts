import type { CustomerQuoteData, PublicData, SignedInUser, ToolContext, UserData } from "../src/tools";

export const sentQuote: CustomerQuoteData = {
  reference: "UDN-2611-K7QMX",
  status: "sent",
  destination: "Bali",
  start_date: "2027-05-10",
  travel_month: "2027-05",
  nights: 5,
  adults: 2,
  children: 0,
  hotel_tier: "4_star",
  preferred_currency: "AED",
  valid_until: "2027-01-10T18:29:59Z",
  is_expired: false,
  accepted_at: null,
  accept_requested_at: null,
  total_inr: 102525,
  inclusions: "Hotels with breakfast\nPrivate transfers",
  exclusions: "Flights",
  lines: [{ type: "hotel", description: "Ubud, 3 nights", price_inr: 47040 }],
  payments: [],
};

export const publicData: PublicData = {
  async findDestination(name) {
    return name.toLowerCase().includes("bali") ? { slug: "bali", name: "Bali", bestMonths: [4, 5, 6], typicalInclusions: ["Hotels with breakfast", "Private transfers"] } : null;
  },
  async rates() {
    return [{ currency: "USD", inrPerUnit: 95.2492, rateDate: "2026-11-06" }, { currency: "AED", inrPerUnit: 25.9358, rateDate: "2026-11-06" }];
  },
  async band() {
    return null;
  },
};

export function fakeUser(overrides: Partial<UserData> = {}): SignedInUser {
  return {
    id: "u1",
    email: "asha@example.com",
    data: {
      submitRequest: async () => ({ reference: "UDN-2611-NEWRF" }),
      quote: async (ref) => (ref === sentQuote.reference ? sentQuote : null),
      accept: async () => ({ result: "accepted", status: "awaiting_payment", total_inr: 102525 }),
      ...overrides,
    },
  };
}

export function context(user: SignedInUser | null, background: Promise<unknown>[] = []): ToolContext {
  return {
    publicData,
    user,
    appUrl: "https://app.udantravelsbdq.com",
    background: (t) => background.push(t),
    notify: {
      requestReceived: async () => "sent",
      accepted: async () => "sent",
      staff: async () => "sent",
    },
  };
}
