import { DISPLAY_CURRENCIES } from "@udan/core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { saveSettings } from "./actions";

export const metadata = { title: "Settings" };

const ERRORS: Record<string, string> = {
  currency: "Please choose one of the listed currencies.",
  country: "Country should be a two-letter code, such as IN, AE or GB.",
  timezone: "That time zone wasn't recognised. Use a name like Asia/Kolkata or Europe/London.",
  save: "Your settings could not be saved. Please try again.",
};

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const { supabase, user } = await requireUser("/account/settings");
  const { data: c } = await supabase.from("customers").select("*").eq("user_id", user.id).maybeSingle();

  return (
    <div className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-udan-charcoal">Your details and alerts</h1>
      {saved && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Saved.</p>}
      {error && ERRORS[error] && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">{ERRORS[error]}</p>}
      <form action={saveSettings} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm">{user.email}</p>
          <p className="text-xs text-udan-gray">Your email is how you sign in and where quotes are sent. To change it, call or email us.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={c?.name ?? ""} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={c?.phone ?? ""} autoComplete="tel" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" maxLength={2} defaultValue={c?.country ?? ""} placeholder="IN" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="time_zone">Time zone</Label>
            <Input id="time_zone" name="time_zone" defaultValue={c?.time_zone ?? ""} placeholder="Asia/Kolkata" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="display_currency">Show prices also in</Label>
          <select id="display_currency" name="display_currency" defaultValue={c?.display_currency ?? "INR"} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm">
            {DISPLAY_CURRENCIES.map((cur) => <option key={cur} value={cur}>{cur === "INR" ? "INR only" : cur}</option>)}
          </select>
          <p className="text-xs text-udan-gray">Quotes are priced in INR. Other currencies are shown at an approximate rate.</p>
        </div>
        <fieldset className="space-y-2 rounded-lg bg-udan-lightGray p-4">
          <legend className="text-sm font-semibold">Alerts</legend>
          <p className="text-sm">Email: always on. Every quote and update is emailed to you.</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="alert_whatsapp" defaultChecked={c?.alert_whatsapp ?? false} /> Also alert me on WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="alert_sms" defaultChecked={c?.alert_sms ?? false} /> Also alert me by SMS
          </label>
          <p className="text-xs text-udan-gray">
            We save these choices now. WhatsApp and SMS alerts are not switched on yet; until they are, everything comes by email. Alerts need a phone number above.
          </p>
        </fieldset>
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
      </form>
    </div>
  );
}
