import type { CabinClass, DocumentType, HotelTier, LineType, PaymentKind, PaymentMethod, PaymentStatus, RequestChannel, RequestStatus, RequestType } from "@udan/core";

/** Shape returned by public.quote_for_customer(): sell prices only. */
export interface CustomerQuote {
  reference: string;
  status: RequestStatus;
  channel: RequestChannel;
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
  requested_at: string;
  quote_version: number;
  sent_at: string | null;
  valid_until: string | null;
  is_expired: boolean;
  accepted_at: string | null;
  accept_requested_at: string | null;
  total_inr: number | null;
  inclusions: string | null;
  exclusions: string | null;
  lines: { type: LineType; description: string; price_inr: number }[];
  payments: { kind: PaymentKind; amount: number; currency: string; method: PaymentMethod; status: PaymentStatus; requested_at: string; received_at: string | null }[];
  documents: { id: string; type: DocumentType; file_name: string; uploaded_at: string }[];
}
