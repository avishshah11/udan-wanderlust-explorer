import "server-only";
import { type RequestChannel, requestReceivedEmail, staffAlertEmail, tripSummary } from "@udan/core";
import { alertStaff, deskUrl, notifyCustomerById, quotePath } from "@/lib/notify";
import { formatTypical, typicalPriceFor } from "@/lib/rate-card";
import { createServiceClient } from "@/lib/supabase/server";

/** Match a typed destination to the catalogue so markup groups apply. */
export async function resolveDestinationSlug(destination: string): Promise<string | undefined> {
  const service = createServiceClient();
  const { data } = await service.from("destinations").select("slug, name");
  const key = destination.trim().toLowerCase();
  return (data ?? []).find((d) => d.name.toLowerCase() === key || d.slug === key)?.slug;
}

/** Confirmation to the customer and an alert to the desk, after the response. */
export async function sendIntakeNotifications(input: {
  requestId: string;
  reference: string;
  customerId: string;
  channel: RequestChannel;
  confirmCustomer: boolean;
}) {
  const service = createServiceClient();
  const { data: r } = await service
    .from("quote_requests")
    .select(
      "request_type, destination, destination_slug, origin_city, nights, adults, children, rooms, hotel_tier, cabin_class, start_date, end_date, travel_month, customers(name, email)",
    )
    .eq("id", input.requestId)
    .single();
  if (!r) return;
  const summary = tripSummary(r);
  if (input.confirmCustomer) {
    const typical = await typicalPriceFor(service, r);
    // Sent to the address on the request: its link signs that inbox's owner in.
    await notifyCustomerById(input.customerId, input.requestId, "request_received", quotePath(input.reference), (accountUrl) =>
      requestReceivedEmail({
        name: r.customers?.name ?? null,
        reference: input.reference,
        tripSummary: summary,
        accountUrl,
        typical: typical ? formatTypical(typical) : null,
      }),
    );
  }
  await alertStaff(
    input.requestId,
    "staff_new_request",
    staffAlertEmail({
      event: "new_request",
      reference: input.reference,
      customer: `${r.customers?.name ?? ""} <${r.customers?.email ?? ""}>`.trim(),
      tripSummary: summary,
      channel: input.channel,
      deskUrl: deskUrl(input.requestId),
    }),
  );
}
