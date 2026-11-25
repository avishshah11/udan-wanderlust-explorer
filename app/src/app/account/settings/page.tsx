import { DISPLAY_CURRENCIES } from "@udan/core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { ShowTipsAgain, Tip } from "@/components/tip";
import { requireUser } from "@/lib/auth";
import { saveSettings } from "./actions";

export const metadata = { title: "Settings" };

const select = "h-11 w-full rounded-md border border-udan-charcoal/30 bg-white px-3 text-base";

// Plain names instead of codes. A value saved earlier that is not listed
// stays selectable, so saving never changes it by accident.
const COUNTRIES: [string, string][] = [
  ["IN", "India"],
  ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["SG", "Singapore"],
  ["SA", "Saudi Arabia"],
  ["QA", "Qatar"],
  ["OM", "Oman"],
  ["KW", "Kuwait"],
  ["BH", "Bahrain"],
  ["KE", "Kenya"],
];
const TIME_ZONES: [string, string][] = [
  ["Asia/Kolkata", "India"],
  ["Asia/Dubai", "UAE and Oman"],
  ["Asia/Riyadh", "Saudi Arabia, Qatar, Kuwait and Bahrain"],
  ["Europe/London", "United Kingdom"],
  ["Europe/Paris", "Central Europe"],
  ["America/New_York", "US and Canada, Eastern"],
  ["America/Chicago", "US and Canada, Central"],
  ["America/Denver", "US and Canada, Mountain"],
  ["America/Los_Angeles", "US and Canada, Pacific"],
  ["Asia/Singapore", "Singapore"],
  ["Australia/Sydney", "Australia, Sydney and Melbourne"],
  ["Australia/Perth", "Australia, Perth"],
  ["Pacific/Auckland", "New Zealand"],
  ["Africa/Nairobi", "East Africa"],
];

function withSaved(options: [string, string][], saved: string | null | undefined): [string, string][] {
  return saved && !options.some(([value]) => value === saved) ? [...options, [saved, saved]] : options;
}

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
    <div className="mx-auto max-w-xl space-y-5">
      <Tip id="settings" title="Your settings">
        <p>Your name and phone number help us when we call you about your trip. Choose a currency if you would like prices shown in it as well as in rupees.</p>
      </Tip>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-udan-charcoal">Your details and alerts</h1>
        {saved && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-4 text-base text-emerald-900">Saved.</p>}
        {error && ERRORS[error] && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-4 text-base text-red-900">{ERRORS[error]}</p>}
        <form action={saveSettings} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <p className="text-base">{user.email}</p>
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
              <Label htmlFor="country">Country you live in</Label>
              <select id="country" name="country" defaultValue={c?.country ?? ""} className={select}>
                <option value="">Choose</option>
                {withSaved(COUNTRIES, c?.country).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="time_zone">Your time zone</Label>
              <select id="time_zone" name="time_zone" defaultValue={c?.time_zone ?? ""} className={select}>
                <option value="">Choose</option>
                {withSaved(TIME_ZONES, c?.time_zone).map(([zone, name]) => (
                  <option key={zone} value={zone}>{name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_currency">Show prices also in</Label>
            <select id="display_currency" name="display_currency" defaultValue={c?.display_currency ?? "INR"} className={select}>
              {DISPLAY_CURRENCIES.map((cur) => <option key={cur} value={cur}>{cur === "INR" ? "INR only" : cur}</option>)}
            </select>
            <p className="text-xs text-udan-gray">Quotes are priced in INR. Other currencies are shown at an approximate rate.</p>
          </div>
          <fieldset className="space-y-2 rounded-lg bg-udan-lightGray p-4">
            <legend className="text-base font-semibold">Alerts</legend>
            <p className="text-base">Email: always on. Every quote and update is emailed to you.</p>
            <label className="flex items-center gap-3 text-base">
              <input type="checkbox" name="alert_whatsapp" className="size-5" defaultChecked={c?.alert_whatsapp ?? false} /> Also alert me on WhatsApp
            </label>
            <label className="flex items-center gap-3 text-base">
              <input type="checkbox" name="alert_sms" className="size-5" defaultChecked={c?.alert_sms ?? false} /> Also alert me by SMS
            </label>
            <p className="text-xs text-udan-gray">
              We save these choices now. WhatsApp and SMS alerts are not switched on yet; until they are, everything comes by email. Alerts need a phone number above.
            </p>
          </fieldset>
          <SubmitButton size="lg" pendingText="Saving…">Save</SubmitButton>
        </form>
      </div>
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-udan-charcoal">Tips</h2>
        <ShowTipsAgain />
      </div>
    </div>
  );
}
