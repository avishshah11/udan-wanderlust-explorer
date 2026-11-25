import { CABIN_CLASS_LABELS, HOTEL_TIER_LABELS, type RequestStatus, type RequestType, findRate, formatInr, partyText, travelWhen } from "@udan/core";
import Link from "next/link";
import { ageText, localTimeIn } from "@/lib/format";
import { loadRates } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";
import { DeskStatus } from "./desk-status";
import { Tip } from "@/components/tip";
import { Button } from "@/components/ui/button";

const TYPE_BADGE: Record<RequestType, string> = { package: "Package", flights: "Flights", hotels: "Hotel" };

export const metadata = { title: "Desk queue" };

const VIEWS: Record<string, { title: string; statuses: RequestStatus[] | null }> = {
  queue: { title: "To price", statuses: ["queued", "pricing"] },
  sent: { title: "Sent, waiting for the customer", statuses: ["sent"] },
  payment: { title: "Accepted: payments and documents", statuses: ["awaiting_payment", "advance_received"] },
  all: { title: "All requests", statuses: null },
};

export default async function DeskQueue({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: viewParam } = await searchParams;
  const view = VIEWS[viewParam ?? "queue"] ?? VIEWS.queue!;
  const supabase = await createClient();
  let query = supabase
    .from("quote_requests")
    .select(
      "id, reference, status, channel, request_type, destination, origin_city, start_date, end_date, travel_month, nights, adults, children, rooms, hotel_tier, cabin_class, budget_min, budget_max, budget_currency, created_at, accept_requested_at, accepted_at, valid_until, total_sell_inr, customers(name, email, time_zone, country)",
    )
    .limit(300);
  if (view.statuses) query = query.in("status", view.statuses);
  const [{ data, error }, rates] = await Promise.all([query, loadRates(supabase)]);
  if (error) throw error;

  const budgetInr = (r: NonNullable<typeof data>[number]) => {
    const amount = r.budget_max ?? r.budget_min;
    if (amount == null) return null;
    const rate = findRate(rates, r.budget_currency);
    return rate ? Number(amount) * rate.inrPerUnit : null;
  };

  // Travel date first (soonest), then budget (largest first); re-checks on top.
  const rows = [...(data ?? [])].sort((a, b) => {
    const recheckA = a.status === "pricing" && a.accept_requested_at ? 0 : 1;
    const recheckB = b.status === "pricing" && b.accept_requested_at ? 0 : 1;
    if (recheckA !== recheckB) return recheckA - recheckB;
    const da = a.start_date ?? a.travel_month;
    const db = b.start_date ?? b.travel_month;
    if (da !== db) return da < db ? -1 : 1;
    return (budgetInr(b) ?? -1) - (budgetInr(a) ?? -1);
  });

  return (
    <div className="space-y-5">
      <Tip id="desk-queue" title="How the desk works">
        <p>
          New requests from customers wait under <strong>To price</strong>. Press <strong>Open</strong> on a request to see it and start pricing.{" "}
          <strong>All requests</strong> lists every customer&apos;s request at any stage; the other tabs show quotes waiting for the customer and accepted
          trips that need payments or documents.
        </p>
      </Tip>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">
          {view.title} <span className="text-udan-gray">({rows.length})</span>
        </h2>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-base text-udan-gray">Nothing here right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-base">
              <thead className="border-b text-sm font-semibold text-udan-gray">
                <tr>
                  <th className="py-2 pr-3">Reference</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Trip</th>
                  <th className="py-2 pr-3">Travel</th>
                  <th className="py-2 pr-3">Budget</th>
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 pr-3">Age</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const local = localTimeIn(r.customers?.time_zone);
                  const binr = budgetInr(r);
                  return (
                    <tr key={r.id} className="border-b align-top last:border-0 hover:bg-udan-lightGray/60">
                      <td className="whitespace-nowrap py-3 pr-3 font-mono text-sm">
                        <Link className="text-udan-blue hover:underline" href={`/desk/requests/${r.id}`}>
                          {r.reference}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium">{r.customers?.name ?? r.customers?.email}</div>
                        <div className="text-xs text-udan-gray">
                          {local ? `${local} · ${r.customers?.time_zone}` : "time zone unknown"}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div>
                          <span className="mr-1.5 rounded bg-udan-lightGray px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-udan-gray">
                            {TYPE_BADGE[r.request_type]}
                          </span>
                          {r.request_type === "flights" ? `${r.origin_city ?? "?"} → ${r.destination}` : r.destination}
                        </div>
                        <div className="text-xs text-udan-gray">
                          {[
                            r.request_type === "flights" ? (r.end_date ? "Return" : "One way") : r.nights ? `${r.nights}N` : null,
                            r.request_type === "hotels" && r.rooms ? `${r.rooms} room${r.rooms === 1 ? "" : "s"}` : null,
                            partyText(r.adults, r.children),
                            r.cabin_class ? CABIN_CLASS_LABELS[r.cabin_class] : null,
                            r.hotel_tier ? HOTEL_TIER_LABELS[r.hotel_tier] : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">{travelWhen(r)}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {binr != null ? formatInr(binr) : <span className="text-udan-gray">not given</span>}
                        {r.budget_currency !== "INR" && r.budget_max != null && (
                          <div className="text-xs text-udan-gray">
                            {r.budget_currency} {Number(r.budget_min ?? 0).toLocaleString("en-GB")}–{Number(r.budget_max).toLocaleString("en-GB")}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3 capitalize">{r.channel}</td>
                      <td className="py-3 pr-3">{ageText(r.created_at)}</td>
                      <td className="py-3 pr-3">
                        <DeskStatus status={r.status} acceptRequestedAt={r.accept_requested_at} acceptedAt={r.accepted_at} />
                      </td>
                      <td className="py-2 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/desk/requests/${r.id}`} aria-label={`Open ${r.reference}`}>
                            Open
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
