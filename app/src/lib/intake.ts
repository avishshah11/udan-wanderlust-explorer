import "server-only";
import { type RequestChannel, requestReceivedEmail, staffAlertEmail, tripSummary } from "@udan/core";
import { publicEnv } from "@/lib/env";
import { alertStaff, deskUrl, notifyCustomerById } from "@/lib/notify";
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
    .select("destination, nights, adults, children, hotel_tier, start_date, travel_month, customers(name, email)")
    .eq("id", input.requestId)
    .single();
  if (!r) return;
  const summary = tripSummary(r);
  if (input.confirmCustomer) {
    await notifyCustomerById(
      input.customerId,
      input.requestId,
      "request_received",
      requestReceivedEmail({
        name: r.customers?.name ?? null,
        reference: input.reference,
        tripSummary: summary,
        accountUrl: `${publicEnv.appUrl}/account/quotes/${input.reference}`,
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
