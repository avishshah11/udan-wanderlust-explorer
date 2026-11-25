"use client";

import {
  CABIN_CLASSES,
  CABIN_CLASS_LABELS,
  DISPLAY_CURRENCIES,
  FLEXIBILITY,
  FLEXIBILITY_LABELS,
  HOTEL_TIERS,
  HOTEL_TIER_LABELS,
  INCLUSIONS,
  INCLUSION_LABELS,
  REQUEST_TYPES,
  REQUEST_TYPE_LABELS,
  type RequestType,
} from "@udan/core";
import { Hotel, Package, Plane } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { COUNTRIES, TIME_ZONES } from "@/lib/places";
import { cn } from "@/lib/utils";

// The quote request, as a few numbered questions in plain words. Field names
// match the request schema in @udan/core (quote-request.ts); the server
// action checks everything again.

export interface RequestFormState {
  errors?: string[];
}

const select = "h-11 w-full rounded-md border border-udan-charcoal/30 bg-white px-3 text-base";

const TYPE_HINTS: Record<RequestType, string> = {
  package: "Hotels, transfers and sightseeing, with flights if you want them",
  flights: "Just the air tickets",
  hotels: "Just the stay",
};
const TYPE_ICONS: Record<RequestType, typeof Plane> = { package: Package, flights: Plane, hotels: Hotel };

function F({ id, label, children, hint, wide }: { id: string; label: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** One numbered question, with its fields in up to two columns. */
function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <legend className="flex items-center gap-3 px-1 text-xl font-bold text-udan-charcoal">
        <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-primary text-base font-bold text-white">
          {n}
        </span>
        {title}
      </legend>
      {hint && <p className="mb-4 text-base text-udan-gray">{hint}</p>}
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** A large tappable radio choice. */
function Choice({ name, value, checked, onChange, children }: { name: string; value: string; checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2 text-base font-medium",
        checked ? "border-primary bg-orange-50 text-udan-charcoal" : "border-zinc-200 bg-white hover:border-primary/40",
      )}
    >
      <input type="radio" className="size-5 accent-[hsl(var(--primary))]" name={name} value={value} checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

function Flexibility() {
  return (
    <F id="flexibility" label="How flexible are your dates?">
      <select id="flexibility" name="flexibility" className={select} defaultValue="fixed">
        {FLEXIBILITY.map((f) => <option key={f} value={f}>{FLEXIBILITY_LABELS[f]}</option>)}
      </select>
    </F>
  );
}

/** Start date, or only the month when the dates are still open. */
function WhenToGo() {
  const [known, setKnown] = useState<"date" | "month">("date");
  return (
    <div className="space-y-3 sm:col-span-2">
      <p className="text-base font-semibold text-udan-charcoal">When do you want to go?</p>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="When do you want to go?">
        <Choice name="when_known" value="date" checked={known === "date"} onChange={() => setKnown("date")}>I know my start date</Choice>
        <Choice name="when_known" value="month" checked={known === "month"} onChange={() => setKnown("month")}>I only know the month</Choice>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {known === "date" ? (
          <F id="start_date" label="Start date"><Input id="start_date" name="start_date" type="date" required /></F>
        ) : (
          <F id="travel_month" label="Month"><Input id="travel_month" name="travel_month" type="month" required /></F>
        )}
        <Flexibility />
      </div>
    </div>
  );
}

function Party({ rooms }: { rooms?: boolean }) {
  const [children, setChildren] = useState(0);
  return (
    <>
      <F id="adults" label="Adults"><Input id="adults" name="adults" type="number" min={1} max={50} defaultValue={2} required /></F>
      <F id="children" label="Children">
        <Input id="children" name="children" type="number" min={0} max={20} defaultValue={0} onChange={(e) => setChildren(Number(e.target.value) || 0)} />
      </F>
      {children > 0 && (
        <F id="child_ages" label="Ages of the children" hint="For example: 6, 9"><Input id="child_ages" name="child_ages" inputMode="numeric" /></F>
      )}
      {rooms && <F id="rooms" label="Rooms"><Input id="rooms" name="rooms" type="number" min={1} max={20} defaultValue={1} required /></F>}
    </>
  );
}

function HotelAndBudget({ defaultCurrency, hotel = true }: { defaultCurrency: string; hotel?: boolean }) {
  return (
    <>
      {hotel && (
        <F id="hotel_tier" label="Hotel category">
          <select id="hotel_tier" name="hotel_tier" className={select} defaultValue="">
            <option value="">No preference</option>
            {HOTEL_TIERS.map((t) => <option key={t} value={t}>{HOTEL_TIER_LABELS[t]}</option>)}
          </select>
        </F>
      )}
      <F id="budget_currency" label="Budget currency">
        <select id="budget_currency" name="budget_currency" className={select} defaultValue={defaultCurrency}>
          {DISPLAY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </F>
      <F id="budget_min" label="Budget from (optional)"><Input id="budget_min" name="budget_min" inputMode="numeric" /></F>
      <F id="budget_max" label="Budget up to (optional)"><Input id="budget_max" name="budget_max" inputMode="numeric" /></F>
    </>
  );
}

function Inclusions() {
  return (
    <div className="flex flex-wrap gap-3 sm:col-span-2">
      {INCLUSIONS.map((i) => (
        <label
          key={i}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-base font-medium has-[:checked]:border-primary has-[:checked]:bg-orange-50"
        >
          <input type="checkbox" className="size-5 accent-[hsl(var(--primary))]" name="inclusions_wanted" value={i} defaultChecked={i === "hotel" || i === "transfers"} />
          {INCLUSION_LABELS[i]}
        </label>
      ))}
    </div>
  );
}

function FlightRoute() {
  const [tripWay, setTripWay] = useState<"return" | "one_way">("return");
  return (
    <>
      <F id="origin_city" label="Flying from"><Input id="origin_city" name="origin_city" required minLength={2} placeholder="Vadodara, Ahmedabad, Mumbai…" /></F>
      <F id="destination" label="Flying to"><Input id="destination" name="destination" required minLength={2} placeholder="Dubai, London, Bali…" /></F>
      <div className="flex flex-wrap gap-3 sm:col-span-2" role="radiogroup" aria-label="Return or one way">
        <Choice name="trip_way" value="return" checked={tripWay === "return"} onChange={() => setTripWay("return")}>Return</Choice>
        <Choice name="trip_way" value="one_way" checked={tripWay === "one_way"} onChange={() => setTripWay("one_way")}>One way</Choice>
      </div>
      <F id="start_date" label="Departure date"><Input id="start_date" name="start_date" type="date" required /></F>
      {tripWay === "return" && <F id="end_date" label="Return date"><Input id="end_date" name="end_date" type="date" required /></F>}
      <Flexibility />
      <F id="cabin_class" label="Cabin class">
        <select id="cabin_class" name="cabin_class" className={select} defaultValue="economy">
          {CABIN_CLASSES.map((c) => <option key={c} value={c}>{CABIN_CLASS_LABELS[c]}</option>)}
        </select>
      </F>
    </>
  );
}

function Destination({ destinations, label, placeholder }: { destinations: string[]; label: string; placeholder: string }) {
  return (
    <F id="destination" label={label}>
      <Input id="destination" name="destination" list="destination-list" required minLength={2} placeholder={placeholder} />
      <datalist id="destination-list">{destinations.map((d) => <option key={d} value={d} />)}</datalist>
    </F>
  );
}

export function RequestForm({
  action,
  mode,
  destinations,
  defaultCurrency = "INR",
  defaultType = "package",
}: {
  action: (state: RequestFormState, fd: FormData) => Promise<RequestFormState>;
  mode: "staff" | "customer";
  destinations: string[];
  defaultCurrency?: string;
  defaultType?: RequestType;
}) {
  const [state, formAction] = useActionState(action, {});
  const [type, setType] = useState<RequestType>(defaultType);
  const [timeZone, setTimeZone] = useState("");
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? ""), []);

  let n = 0;
  const next = () => ++n;

  return (
    <form action={formAction} className="space-y-6">
      {state.errors && state.errors.length > 0 && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-base text-red-900">
          <p className="font-semibold">Please check these and try again:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      {mode === "staff" ? (
        <Step n={next()} title="Who is the customer?">
          <F id="email" label="Email (their account)"><Input id="email" name="email" type="email" required /></F>
          <F id="name" label="Name"><Input id="name" name="name" /></F>
          <F id="phone" label="Phone (optional)"><Input id="phone" name="phone" type="tel" /></F>
          <F id="channel" label="Came in by">
            <select id="channel" name="channel" className={select} defaultValue="staff">
              <option value="staff">Phone, WhatsApp or walk-in</option>
              <option value="email">Email</option>
            </select>
          </F>
          <F id="country" label="Country they live in">
            <select id="country" name="country" className={select} defaultValue="IN">
              <option value="">Not known</option>
              {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
          </F>
          <F id="time_zone" label="Their time zone">
            <select id="time_zone" name="time_zone" className={select} defaultValue="Asia/Kolkata">
              {TIME_ZONES.map(([zone, name]) => <option key={zone} value={zone}>{name}</option>)}
            </select>
          </F>
          <label className="flex items-center gap-3 text-base sm:col-span-2">
            <input type="checkbox" className="size-5" name="send_confirmation" defaultChecked /> Email them a confirmation with the reference
          </label>
        </Step>
      ) : (
        <input type="hidden" name="time_zone" value={timeZone} />
      )}

      <fieldset className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
        <legend className="flex items-center gap-3 px-1 text-xl font-bold text-udan-charcoal">
          <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-primary text-base font-bold text-white">{next()}</span>
          {mode === "staff" ? "Type of request" : "What do you need?"}
        </legend>
        <input type="hidden" name="request_type" value={type} />
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Quote type">
          {REQUEST_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t];
            return (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                  type === t ? "border-primary bg-orange-50" : "border-zinc-200 bg-white hover:border-primary/40",
                )}
              >
                <Icon aria-hidden className={cn("mt-0.5 size-6 shrink-0", type === t ? "text-primary" : "text-udan-gray")} />
                <span>
                  <span className="block text-lg font-bold text-udan-charcoal">{REQUEST_TYPE_LABELS[t]}</span>
                  <span className="block text-base text-udan-gray">{TYPE_HINTS[t]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {type === "package" && (
        <>
          <Step n={next()} title="Where and when?">
            <Destination destinations={destinations} label="Where do you want to go?" placeholder="Bali, Kerala, Dubai…" />
            <F id="nights" label="How many nights?"><Input id="nights" name="nights" type="number" min={1} max={90} required /></F>
            <WhenToGo />
            <F id="origin_city" label="Travelling from (for flights)" wide><Input id="origin_city" name="origin_city" placeholder="Vadodara" /></F>
          </Step>
          <Step n={next()} title="Who is travelling?"><Party /></Step>
          <Step n={next()} title="Hotel and budget" hint="Leave the budget empty if you would rather we suggest."><HotelAndBudget defaultCurrency={defaultCurrency} /></Step>
          <Step n={next()} title="What should we include?" hint="Tick everything you want in the price."><Inclusions /></Step>
        </>
      )}
      {type === "flights" && (
        <>
          <Step n={next()} title="Your flights"><FlightRoute /></Step>
          <Step n={next()} title="Who is travelling?"><Party /></Step>
          <Step n={next()} title="Budget" hint="Optional. Leave it empty if you would rather we suggest."><HotelAndBudget defaultCurrency={defaultCurrency} hotel={false} /></Step>
        </>
      )}
      {type === "hotels" && (
        <>
          <Step n={next()} title="Your stay">
            <Destination destinations={destinations} label="City or area" placeholder="Goa, Munnar, Dubai Marina…" />
            <F id="hotel_name" label="Hotel you have in mind (optional)"><Input id="hotel_name" name="hotel_name" placeholder="A name, or the kind of place" /></F>
            <F id="start_date" label="Check-in"><Input id="start_date" name="start_date" type="date" required /></F>
            <F id="end_date" label="Check-out"><Input id="end_date" name="end_date" type="date" required /></F>
            <Flexibility />
          </Step>
          <Step n={next()} title="Who is staying?"><Party rooms /></Step>
          <Step n={next()} title="Hotel and budget" hint="Leave the budget empty if you would rather we suggest."><HotelAndBudget defaultCurrency={defaultCurrency} /></Step>
        </>
      )}

      <Step n={next()} title="Anything else?">
        <F id="customer_notes" label="Anything else we should know" hint="Special occasions, food, walking, places you would like to see…" wide>
          <Textarea id="customer_notes" name="customer_notes" rows={3} />
        </F>
        <details className="group rounded-xl bg-udan-lightGray p-4 sm:col-span-2">
          <summary className="cursor-pointer text-base font-semibold text-udan-charcoal">More details (optional)</summary>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {type === "package" && (
              <F id="itinerary" label="Your plan, if you already have one" hint="One stop per line, for example: Ubud, 3 nights, pool villa" wide>
                <Textarea id="itinerary" name="itinerary" rows={4} />
              </F>
            )}
            <p className="text-base font-semibold text-udan-charcoal sm:col-span-2">Seen a price on another website? We will try to beat it.</p>
            <F id="ota_name" label="Website"><Input id="ota_name" name="ota_name" placeholder="For example MakeMyTrip" /></F>
            <F id="ota_product" label={type === "flights" ? "Airline or flight" : type === "hotels" ? "Hotel" : "Hotel or package"}>
              <Input id="ota_product" name="ota_product" />
            </F>
            <F id="ota_room" label={type === "flights" ? "Fare type" : "Room type"}><Input id="ota_room" name="ota_room" /></F>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
              <F id="ota_price" label="Price"><Input id="ota_price" name="ota_price" inputMode="numeric" /></F>
              <F id="ota_currency" label="Currency">
                <select id="ota_currency" name="ota_currency" className={select} defaultValue="INR">
                  {DISPLAY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </F>
            </div>
            <F id="preferred_currency" label="Show prices also in">
              <select id="preferred_currency" name="preferred_currency" className={select} defaultValue={defaultCurrency}>
                {DISPLAY_CURRENCIES.map((c) => <option key={c} value={c}>{c === "INR" ? "INR only" : c}</option>)}
              </select>
            </F>
          </div>
        </details>
      </Step>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Sending…">
          {mode === "staff" ? "Create request" : "Send my request"}
        </SubmitButton>
        {mode === "customer" && <p className="text-base text-udan-gray">Nothing is booked or paid when you send this.</p>}
      </div>
    </form>
  );
}
