"use server";

import { describeIssues, quoteRequestSchema, toIntakePayload } from "@udan/core";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { RequestFormState } from "@/components/request-form/request-form";
import { formDataToRequestInput } from "@/components/request-form/parse";
import { requireUser } from "@/lib/auth";
import { resolveDestinationSlug, sendIntakeNotifications } from "@/lib/intake";

export async function submitCustomerRequest(_prev: RequestFormState, fd: FormData): Promise<RequestFormState> {
  const { supabase } = await requireUser("/account/new");
  const parsed = quoteRequestSchema.safeParse(formDataToRequestInput(fd));
  if (!parsed.success) return { errors: describeIssues(parsed.error) };
  const payload = toIntakePayload({ ...parsed.data, destination_slug: parsed.data.destination_slug ?? (await resolveDestinationSlug(parsed.data.destination)) });

  const { data, error } = await supabase.rpc("submit_quote_request", { p_channel: "web", p_request: payload as never });
  const created = data?.[0];
  if (error || !created) return { errors: [error?.message ?? "Your request could not be sent. Please try again."] };

  after(() =>
    sendIntakeNotifications({
      requestId: created.request_id,
      reference: created.reference,
      customerId: created.customer_id,
      channel: "web",
      confirmCustomer: true,
    }),
  );
  redirect(`/account/quotes/${created.reference}?notice=received`);
}
