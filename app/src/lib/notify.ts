import "server-only";
import { type DeliveryResult, type EmailConfig, type RenderedEmail, SIGN_IN_LINK_NOTE, notifyCustomer, sendEmail, withNote } from "@udan/core";
import { publicEnv, serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export function emailConfig(): EmailConfig {
  return { apiKey: serverEnv.resendApiKey, from: serverEnv.emailFrom, replyTo: serverEnv.emailReplyTo };
}

export const quotePath = (reference: string) => `/account/quotes/${reference}`;
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

/**
 * The address an email's account button opens: a one-time link that signs the
 * customer in on the way (invisible sign-in), or the plain page when no link
 * can be made (a staff member's address, or the database is unreachable).
 */
async function accountLink(customerId: string, path: string): Promise<{ url: string; signsIn: boolean }> {
  const { data: token, error } = await createServiceClient().rpc("create_sign_in_link", {
    p_customer_id: customerId,
    p_next: path,
  });
  if (error || !token) return { url: `${publicEnv.appUrl}${path}`, signsIn: false };
  return { url: `${publicEnv.appUrl}/auth/link?t=${token}`, signsIn: true };
}

/**
 * Email the customer (plus any opted-in alert channel) and log the attempt.
 * `path` is the account page the email's button opens; `render` builds the
 * email around the link to it. Only call this for emails sent to the
 * customer's own address: the link signs whoever clicks it in.
 */
export async function notifyCustomerById(
  customerId: string,
  requestId: string | null,
  kind: string,
  path: string,
  render: (accountUrl: string) => RenderedEmail,
) {
  const service = createServiceClient();
  const { data: c } = await service
    .from("customers")
    .select("email, phone, alert_whatsapp, alert_sms")
    .eq("id", customerId)
    .single();
  if (!c) return;
  const link = await accountLink(customerId, path);
  const email = link.signsIn ? withNote(render(link.url), SIGN_IN_LINK_NOTE) : render(link.url);
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
