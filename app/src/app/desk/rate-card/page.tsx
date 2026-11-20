import {
  BAND_COVERS,
  BAND_EXCLUDES,
  HOTEL_TIER_LABELS,
  MIN_BAND_SAMPLES,
  NIGHTS_GROUPS,
  RATE_IMPORT_COLUMNS,
  formatInr,
  nightsGroupLabel,
} from "@udan/core";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { rebuildNow, removeImport } from "./actions";
import { ImportForm } from "./import-form";

export const metadata = { title: "Rate card" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const COLUMN_HELP: Record<(typeof RATE_IMPORT_COLUMNS)[number], string> = {
  destination: "Name or slug from the list below, e.g. Bali",
  travel_month: "1-12, Mar, March or 2025-03",
  hotel_tier: "3, 4 or 5",
  nights: "1-90",
  adults: "1-50",
  children: "optional, 0 if blank",
  land_total_inr: `price quoted for the whole party for ${BAND_COVERS}, without ${BAND_EXCLUDES}`,
  quoted_on: "optional, 2025-03-14 or 14/03/2025",
  note: "optional",
};

export default async function RateCard({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: destinations }, { data: summary }, { data: bands }, { data: batches }, { data: staff }] = await Promise.all([
    supabase.from("destinations").select("slug, name").order("name"),
    supabase.from("rate_sample_summary").select("*"),
    supabase.from("rate_card").select("*").order("destination_slug").order("hotel_tier").order("nights_group").order("month", { nullsFirst: true }),
    supabase.from("rate_import_batches").select("*").order("imported_at", { ascending: false }).limit(10),
    supabase.from("staff").select("user_id, name"),
  ]);
  const nameOf = new Map((destinations ?? []).map((d) => [d.slug, d.name]));
  const staffName = new Map((staff ?? []).map((s) => [s.user_id, s.name]));
  const bySlug = new Map((summary ?? []).map((s) => [s.destination_slug, s]));
  const publicCount = (slug: string) => (bands ?? []).filter((b) => b.destination_slug === slug && b.sample_count >= MIN_BAND_SAMPLES).length;
  const updated = (bands ?? [])[0]?.updated_at;

  return (
    <div className="space-y-5">
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}

      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold">Rate card</h2>
            <p className="text-sm text-udan-gray">
              Typical price ranges from our own past quotes, per adult on twin sharing, covering {BAND_COVERS}; {BAND_EXCLUDES} are left out. Every holiday-package quote
              you send adds one. A range is shown to customers (website, Claude, confirmation emails) only once {MIN_BAND_SAMPLES} quotes back it, and it is the middle half
              of those prices, so one unusual quote does not stretch it. Ranges rebuild every night at 02:00, after each import, or now.
            </p>
          </div>
          <form action={rebuildNow}>
            <SubmitButton variant="outline" size="sm" pendingText="Rebuilding…">Rebuild ranges now</SubmitButton>
          </form>
        </div>
        <p className="text-xs text-udan-gray">{updated ? `Last rebuilt ${formatDateTime(updated)}.` : "Not built yet."}</p>

        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-udan-gray">
            <tr><th className="py-2">Destination</th><th>From the desk</th><th>Imported</th><th>Usable for ranges</th><th>Public ranges</th></tr>
          </thead>
          <tbody>
            {(destinations ?? []).map((d) => {
              const s = bySlug.get(d.slug);
              return (
                <tr key={d.slug} className="border-b">
                  <td className="py-2 font-medium">{d.name}</td>
                  <td>{s?.desk_samples ?? 0}</td>
                  <td>{s?.imported_samples ?? 0}</td>
                  <td>{s?.banded_samples ?? 0}</td>
                  <td>{publicCount(d.slug)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-udan-gray">Usable: adults-only quotes for two or more adults. Family quotes with children are kept but priced in each firm quote.</p>
      </section>

      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Ranges</h2>
        {(bands ?? []).length === 0 ? (
          <p className="text-sm text-udan-gray">No ranges yet. Import past quotes below, or send holiday-package quotes from the queue.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-udan-gray">
              <tr><th className="py-2">Destination</th><th>Hotel</th><th>Nights</th><th>Month</th><th>Per adult</th><th>Quotes</th><th>Shown to customers</th></tr>
            </thead>
            <tbody>
              {(bands ?? []).map((b) => (
                <tr key={`${b.destination_slug}-${b.hotel_tier}-${b.nights_group}-${b.month}`} className="border-b">
                  <td className="py-2">{nameOf.get(b.destination_slug) ?? b.destination_slug}</td>
                  <td>{HOTEL_TIER_LABELS[b.hotel_tier]}</td>
                  <td>{nightsGroupLabel(b.nights_group)}</td>
                  <td>{b.month ? MONTHS[b.month - 1] : <em className="text-udan-gray">any</em>}</td>
                  <td className="whitespace-nowrap">{formatInr(Number(b.price_low))} to {formatInr(Number(b.price_high))}</td>
                  <td>{b.sample_count}</td>
                  <td>{b.sample_count >= MIN_BAND_SAMPLES ? "Yes" : <span className="text-udan-gray">No, needs {MIN_BAND_SAMPLES - b.sample_count} more</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-udan-gray">Nights are grouped: {NIGHTS_GROUPS.map(nightsGroupLabel).join(", ")}.</p>
      </section>

      <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold">Import past quotes</h2>
          <p className="text-sm text-udan-gray">
            One row per quote, with a header row. Start from the <a className="text-udan-blue underline" href="/rate-card-template.csv" download>empty template</a>, fill it
            in Excel or Google Sheets, and save or download it as CSV. The file is checked first: if any line has a problem, nothing is imported and every problem is
            listed. Importing the same file twice adds nothing.
          </p>
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
          {RATE_IMPORT_COLUMNS.map((c) => (
            <div key={c} className="flex gap-2">
              <dt className="font-mono text-xs leading-5 text-udan-charcoal">{c}</dt>
              <dd className="text-udan-gray">{COLUMN_HELP[c]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-udan-gray">Destinations on the desk: {(destinations ?? []).map((d) => d.name).join(", ")}.</p>
        <div className="rounded-lg bg-udan-lightGray p-4">
          <ImportForm />
        </div>

        {(batches ?? []).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">Recent imports</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {(batches ?? []).map((b) => (
                <li key={b.import_batch} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                  <span>
                    {b.samples} quotes, {formatDateTime(b.imported_at)}
                    {b.imported_by && staffName.get(b.imported_by) ? ` by ${staffName.get(b.imported_by)}` : ""}
                  </span>
                  <form action={removeImport}>
                    <input type="hidden" name="batch" value={b.import_batch ?? ""} />
                    <SubmitButton variant="outline" size="sm" pendingText="Removing…">Remove this import</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
