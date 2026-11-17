"use client";

import { DISPLAY_CURRENCIES, FLEXIBILITY, FLEXIBILITY_LABELS, HOTEL_TIERS, HOTEL_TIER_LABELS, INCLUSIONS, INCLUSION_LABELS } from "@udan/core";
import { useActionState, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";

export interface RequestFormState {
  errors?: string[];
}

const select = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm";

function F({ id, label, children, hint }: { id: string; label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function RequestForm({
  action,
  mode,
  destinations,
  defaultCurrency = "INR",
}: {
  action: (state: RequestFormState, fd: FormData) => Promise<RequestFormState>;
  mode: "staff" | "customer";
  destinations: string[];
  defaultCurrency?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [timeZone, setTimeZone] = useState("");
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""), []);

  return (
    <form action={formAction} className="space-y-6">
      {state.errors && state.errors.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-900">
          <p className="font-medium">Please check these and try again:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      {mode === "staff" ? (
        <fieldset className="grid gap-4 md:grid-cols-3">
          <legend className="mb-2 text-sm font-semibold">Customer</legend>
          <F id="email" label="Email (their account identity)"><Input id="email" name="email" type="email" required /></F>
          <F id="name" label="Name"><Input id="name" name="name" /></F>
          <F id="phone" label="Phone (optional)"><Input id="phone" name="phone" type="tel" /></F>
          <F id="country" label="Country code" hint="e.g. IN, AE, GB"><Input id="country" name="country" maxLength={2} /></F>
          <F id="time_zone" label="Time zone" hint="e.g. Asia/Dubai"><Input id="time_zone" name="time_zone" defaultValue="Asia/Kolkata" /></F>
          <F id="channel" label="Came in by">
            <select id="channel" name="channel" className={select} defaultValue="staff">
              <option value="staff">Phone, WhatsApp or walk-in</option>
              <option value="email">Email</option>
            </select>
          </F>
          <label className="flex items-center gap-2 text-sm md:col-span-3">
            <input type="checkbox" name="send_confirmation" defaultChecked /> Email them a confirmation with the reference
          </label>
        </fieldset>
      ) : (
        <input type="hidden" name="time_zone" value={timeZone} />
      )}

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold">Trip</legend>
        <F id="destination" label="Where to">
          <Input id="destination" name="destination" list="destination-list" required placeholder="Bali, Kerala, Dubai…" />
          <datalist id="destination-list">{destinations.map((d) => <option key={d} value={d} />)}</datalist>
        </F>
        <F id="origin_city" label="Travelling from (for flights)"><Input id="origin_city" name="origin_city" placeholder="Vadodara" /></F>
        <F id="nights" label="Nights"><Input id="nights" name="nights" type="number" min={1} max={90} required /></F>
        <F id="start_date" label="Start date" hint="Or just the month, below"><Input id="start_date" name="start_date" type="date" /></F>
        <F id="travel_month" label="Month (if dates are open)"><Input id="travel_month" name="travel_month" type="month" /></F>
        <F id="flexibility" label="Flexibility">
          <select id="flexibility" name="flexibility" className={select} defaultValue="fixed">
            {FLEXIBILITY.map((f) => <option key={f} value={f}>{FLEXIBILITY_LABELS[f]}</option>)}
          </select>
        </F>
        <F id="adults" label="Adults"><Input id="adults" name="adults" type="number" min={1} max={50} defaultValue={2} required /></F>
        <F id="children" label="Children"><Input id="children" name="children" type="number" min={0} max={20} defaultValue={0} /></F>
        <F id="child_ages" label="Children's ages" hint="Comma separated, e.g. 6, 9"><Input id="child_ages" name="child_ages" /></F>
        <F id="hotel_tier" label="Hotel category">
          <select id="hotel_tier" name="hotel_tier" className={select} defaultValue="">
            <option value="">No preference</option>
            {HOTEL_TIERS.map((t) => <option key={t} value={t}>{HOTEL_TIER_LABELS[t]}</option>)}
          </select>
        </F>
        <F id="budget_min" label="Budget from"><Input id="budget_min" name="budget_min" inputMode="numeric" /></F>
        <F id="budget_max" label="Budget up to"><Input id="budget_max" name="budget_max" inputMode="numeric" /></F>
        <F id="budget_currency" label="Budget currency">
          <select id="budget_currency" name="budget_currency" className={select} defaultValue={defaultCurrency}>
            {DISPLAY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </F>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">What should we include?</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {INCLUSIONS.map((i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="inclusions_wanted" value={i} defaultChecked={i === "hotel" || i === "transfers"} />
              {INCLUSION_LABELS[i]}
            </label>
          ))}
        </div>
      </fieldset>

      <F id="itinerary" label="Itinerary, if you have one" hint="One item per line. Start a line with hotel:, flight:, transfer: or activity: if you like.">
        <Textarea id="itinerary" name="itinerary" rows={4} placeholder={"hotel: Ubud, 3 nights, pool villa\nhotel: Seminyak, 2 nights\nactivity: Mount Batur sunrise trek"} />
      </F>

      <fieldset className="grid gap-4 rounded-lg border border-dashed p-4 md:grid-cols-5">
        <legend className="px-1 text-sm font-semibold">Seen a price elsewhere? (optional)</legend>
        <F id="ota_name" label="Website"><Input id="ota_name" name="ota_name" placeholder="e.g. MakeMyTrip" /></F>
        <F id="ota_product" label="Hotel or package"><Input id="ota_product" name="ota_product" /></F>
        <F id="ota_room" label="Room type"><Input id="ota_room" name="ota_room" /></F>
        <F id="ota_price" label="Price"><Input id="ota_price" name="ota_price" inputMode="numeric" /></F>
        <F id="ota_currency" label="Currency">
          <select id="ota_currency" name="ota_currency" className={select} defaultValue="INR">
            {DISPLAY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </F>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <F id="customer_notes" label="Anything else we should know"><Textarea id="customer_notes" name="customer_notes" rows={3} /></F>
        </div>
        <F id="preferred_currency" label="Show prices also in">
          <select id="preferred_currency" name="preferred_currency" className={select} defaultValue={defaultCurrency}>
            {DISPLAY_CURRENCIES.map((c) => <option key={c} value={c}>{c === "INR" ? "INR only" : c}</option>)}
          </select>
        </F>
      </div>

      <SubmitButton size="lg" pendingText="Sending…">{mode === "staff" ? "Create request" : "Request my quote"}</SubmitButton>
    </form>
  );
}
