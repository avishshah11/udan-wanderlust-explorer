import { type EmailConfig, type FxRate, displayPrice, quoteAcceptedEmail, requestReceivedEmail, sendEmail, staffAlertEmail } from "@udan/core";
import type { Env } from "./env";
import type { SignedInUser, ToolContext } from "./tools";

export function notifier(env: Env, rates: () => Promise<FxRate[]>): ToolContext["notify"] {
  const config: EmailConfig = { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM };
  const quoteUrl = (ref: string) => `${env.APP_URL}/account/quotes/${ref}`;
  const staff = (env.STAFF_ALERT_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  return {
    requestReceived: (user: SignedInUser, reference: string, summary: string) =>
      sendEmail(config, user.email, requestReceivedEmail({ name: null, reference, tripSummary: summary, accountUrl: quoteUrl(reference) })),
    accepted: async (user: SignedInUser, reference: string, totalInr: number | null) =>
      totalInr == null
        ? null
        : sendEmail(config, user.email, quoteAcceptedEmail({ name: null, reference, total: displayPrice(totalInr, "INR", await rates()), quoteUrl: quoteUrl(reference) })),
    staff: async (event, user, reference, summary) =>
      staff.length === 0
        ? null
        : sendEmail(
            config,
            staff,
            staffAlertEmail({ event, reference, customer: user.email, tripSummary: summary, channel: "claude", deskUrl: `${env.APP_URL}/desk?view=all` }),
          ),
  };
}
