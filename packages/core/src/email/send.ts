// Delivery adapters. Email goes through Resend's HTTP API (works in Node and
// Cloudflare Workers, no SDK). WhatsApp and SMS are per-customer opt-ins
// that are stored but not connected to a provider yet; their adapters say so.

import type { RenderedEmail } from "./layout";

export interface DeliveryResult {
  channel: "email" | "whatsapp" | "sms";
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

export interface EmailConfig {
  apiKey: string | undefined;
  from: string; // "Udan Tours and Travels <quotes@udantravelsbdq.com>"
  replyTo?: string;
  fetch?: typeof fetch;
}

export async function sendEmail(
  config: EmailConfig,
  to: string | readonly string[],
  email: RenderedEmail,
): Promise<DeliveryResult> {
  if (!config.apiKey) {
    // Local development: print instead of sending.
    console.info(`[email skipped: RESEND_API_KEY not set] to=${String(to)} subject=${email.subject}\n${email.text}`);
    return { channel: "email", ok: false, skipped: true, error: "RESEND_API_KEY is not set" };
  }
  const doFetch = config.fetch ?? fetch;
  try {
    const res = await doFetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.from,
        to: typeof to === "string" ? [to] : to,
        reply_to: config.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { channel: "email", ok: false, error: body.message ?? `Resend returned ${res.status}` };
    return { channel: "email", ok: true, id: body.id };
  } catch (err) {
    return { channel: "email", ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Stub: WhatsApp alerts are opt-in and stored, but no provider is connected yet. */
export async function sendWhatsAppAlert(_phone: string, _text: string): Promise<DeliveryResult> {
  return { channel: "whatsapp", ok: false, skipped: true, error: "WhatsApp alerts are not connected to a provider yet" };
}

/** Stub: SMS alerts are opt-in and stored, but no provider is connected yet. */
export async function sendSmsAlert(_phone: string, _text: string): Promise<DeliveryResult> {
  return { channel: "sms", ok: false, skipped: true, error: "SMS alerts are not connected to a provider yet" };
}

/**
 * Email always; WhatsApp/SMS only when the customer opted in and has a phone.
 * Returns every attempt so callers can log them.
 */
export async function notifyCustomer(
  config: EmailConfig,
  customer: { email: string; phone: string | null; alertWhatsapp: boolean; alertSms: boolean },
  email: RenderedEmail,
): Promise<DeliveryResult[]> {
  const results = [await sendEmail(config, customer.email, email)];
  const shortText = `${email.subject}. Details in your email and Udan account.`;
  if (customer.alertWhatsapp && customer.phone) results.push(await sendWhatsAppAlert(customer.phone, shortText));
  if (customer.alertSms && customer.phone) results.push(await sendSmsAlert(customer.phone, shortText));
  return results;
}
