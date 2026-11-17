import "server-only";
import { type DeliveryResult, type EmailConfig, type RenderedEmail, notifyCustomer, sendEmail } from "@udan/core";
import { publicEnv, serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export function emailConfig(): EmailConfig {
  return { apiKey: serverEnv.resendApiKey, from: serverEnv.emailFrom, replyTo: serverEnv.emailReplyTo };
}

export const quoteUrl = (reference: string) => `${publicEnv.appUrl}/account/quotes/${reference}`;
export const deskUrl = (requestId: string) => `${publicEnv.appUrl}/desk/requests/${requestId}`;

async function logDelivery(requestId: string | null, kind: string, results: DeliveryResult[]) {
  const service = createServiceClient();
  await service.from("audit_log").insert({
    action: "notification",
    table_name: "quote_requests",
    row_id: requestId,
    request_id: requestId,
    detail: { kind, results: results.map((r) => ({ ...r })) },
  });
}

/** Email the customer (plus any opted-in alert channel) and log the attempt. */
export async function notifyCustomerById(customerId: string, requestId: string | null, kind: string, email: RenderedEmail) {
  const service = createServiceClient();
  const { data: c } = await service
    .from("customers")
    .select("email, phone, alert_whatsapp, alert_sms")
    .eq("id", customerId)
    .single();
  if (!c) return;
  const results = await notifyCustomer(
    emailConfig(),
    { email: c.email, phone: c.phone, alertWhatsapp: c.alert_whatsapp, alertSms: c.alert_sms },
    email,
  );
  await logDelivery(requestId, kind, results);
}

/** Email every active staff member who receives alerts (or STAFF_ALERT_EMAIL). */
export async function alertStaff(requestId: string | null, kind: string, email: RenderedEmail) {
  const service = createServiceClient();
  const { data } = await service.from("staff").select("email").eq("active", true).eq("receives_alerts", true);
  const to = (data ?? []).map((s) => s.email);
  if (to.length === 0 && serverEnv.staffAlertEmail) to.push(serverEnv.staffAlertEmail);
  if (to.length === 0) return;
  const result = await sendEmail(emailConfig(), to, email);
  await logDelivery(requestId, kind, [result]);
}
