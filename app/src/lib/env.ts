// Environment access with errors that say which variable is missing.
// NEXT_PUBLIC_* values are referenced literally so Next can inline them.

function need(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See app/.env.example.`);
  return value;
}

export const publicEnv = {
  get supabaseUrl() {
    return need("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  },
  get appUrl() {
    return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://udantravelsbdq.com").replace(/\/$/, "");
  },
  /** "Continue with Google" shows only once Google sign-in is set up in Supabase. */
  get googleSignIn() {
    return process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === "on";
  },
};

export const serverEnv = {
  get supabaseSecretKey() {
    return need("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY || undefined;
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "Udan Tours and Travels <quotes@udantravelsbdq.com>";
  },
  get emailReplyTo() {
    return process.env.EMAIL_REPLY_TO || undefined;
  },
  /** The business inbox that gets every desk alert (comma-separated for more than one). */
  get staffAlertEmail() {
    return process.env.STAFF_ALERT_EMAIL || undefined;
  },
  /** Optional prefill for the bank-transfer payment email on the desk. */
  get paymentDetailsBank() {
    return process.env.PAYMENT_DETAILS_BANK ?? "";
  },
  /** Optional prefill for the UPI payment email on the desk. */
  get paymentDetailsUpi() {
    return process.env.PAYMENT_DETAILS_UPI ?? "";
  },
  /** Website origins allowed to post the Get a quote form. */
  get allowedFormOrigins(): string[] {
    return (process.env.QUOTE_FORM_ORIGINS ?? "https://udantravelsbdq.com,https://www.udantravelsbdq.com,http://localhost:4321")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
};
