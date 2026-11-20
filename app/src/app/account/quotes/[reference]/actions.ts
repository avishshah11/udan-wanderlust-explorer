"use server";

import { normalizeReference, quoteAcceptedEmail, staffAlertEmail, tripSummary, displayPrice } from "@udan/core";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadRates } from "@/lib/fx";
import { alertStaff, deskUrl, notifyCustomerById, quotePath } from "@/lib/notify";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Accept: the database freezes the quote and sets awaiting_payment in one
 * statement, so the confirmation screen is shown at once. Emails to the
 * customer and the desk go out after the response.
 */
export async function acceptQuote(fd: FormData) {
  const reference = normalizeReference(String(fd.get("reference") ?? "")) ?? String(fd.get("reference") ?? "");
  const { supabase } = await requireUser(`/account/quotes/${reference}`);
  const { data, error } = await supabase.rpc("accept_quote", { p_reference: reference });
  const result = (data as { result?: string } | null)?.result;
  if (error || !result) redirect(`/account/quotes/${reference}?error=accept`);

  if (result === "accepted" || result === "recheck") {
    after(async () => {
      const service = createServiceClient();
      const { data: r } = await service
        .from("quote_requests")
        .select("id, reference, channel, customer_id, request_type, destination, origin_city, nights, adults, children, rooms, hotel_tier, cabin_class, start_date, end_date, travel_month, total_sell_inr, customers(name, email, display_currency)")
        .eq("reference", reference)
        .single();
      if (!r) return;
      const summary = tripSummary(r);
      await alertStaff(
        r.id,
        `staff_${result}`,
        staffAlertEmail({
          event: result === "accepted" ? "accepted" : "recheck",
          reference: r.reference,
          customer: `${r.customers?.name ?? ""} <${r.customers?.email ?? ""}>`.trim(),
          tripSummary: summary,
          channel: r.channel,
          deskUrl: deskUrl(r.id),
        }),
      );
      if (result === "accepted" && r.total_sell_inr != null) {
        const rates = await loadRates(service);
        await notifyCustomerById(r.customer_id, r.id, "quote_accepted", quotePath(r.reference), (accountUrl) =>
          quoteAcceptedEmail({
            name: r.customers?.name ?? null,
            reference: r.reference,
            total: displayPrice(Number(r.total_sell_inr), r.customers?.display_currency ?? "INR", rates),
            quoteUrl: accountUrl,
          }),
        );
      }
    });
  }

  if (result === "accepted") redirect(`/account/quotes/${reference}/accepted`);
  if (result === "recheck") redirect(`/account/quotes/${reference}?notice=recheck`);
  if (result === "already_accepted") redirect(`/account/quotes/${reference}`);
  redirect(`/account/quotes/${reference}?error=${result}`);
}
