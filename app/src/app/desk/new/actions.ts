"use server";

import { describeIssues, quoteRequestSchema, toIntakePayload } from "@udan/core";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { RequestFormState } from "@/components/request-form/request-form";
import { formDataToRequestInput } from "@/components/request-form/parse";
import { requireStaff } from "@/lib/auth";
import { resolveDestinationSlug, sendIntakeNotifications } from "@/lib/intake";

export async function createStaffRequest(_prev: RequestFormState, fd: FormData): Promise<RequestFormState> {
  const { supabase } = await requireStaff("/desk/new");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { errors: ["email: Enter the customer's email address; it is how they sign in and receive quotes."] };
  const channel = fd.get("channel") === "email" ? "email" : "staff";

  const parsed = quoteRequestSchema.safeParse(formDataToRequestInput(fd));
  if (!parsed.success) return { errors: describeIssues(parsed.error) };
  const payload = toIntakePayload({ ...parsed.data, destination_slug: parsed.data.destination_slug ?? (await resolveDestinationSlug(parsed.data.destination)) });

  const { data, error } = await supabase.rpc("intake_quote_request", {
    p_email: email,
    p_name: String(fd.get("name") ?? ""),
    p_phone: String(fd.get("phone") ?? ""),
    p_channel: channel,
    p_request: payload as never,
  });
  const created = data?.[0];
  if (error || !created) return { errors: [error?.message ?? "The request could not be created."] };

  after(() =>
    sendIntakeNotifications({
      requestId: created.request_id,
      reference: created.reference,
      customerId: created.customer_id,
      channel,
      confirmCustomer: fd.get("send_confirmation") === "on",
    }),
  );
  redirect(`/desk/requests/${created.request_id}?notice=${encodeURIComponent(`Request ${created.reference} created.`)}`);
}
