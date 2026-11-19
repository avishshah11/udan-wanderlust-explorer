import { formatInr, tripSummary } from "@udan/core";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";

export const metadata = { title: "My quotes" };

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const { supabase, user } = await requireUser("/account");
  const [{ data: customer }, { data: requests }] = await Promise.all([
    supabase.from("customers").select("id, name").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("quote_requests")
      .select("reference, status, request_type, destination, origin_city, nights, adults, children, rooms, hotel_tier, cabin_class, start_date, end_date, travel_month, total_sell_inr, valid_until, accepted_at, accept_requested_at, created_at")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {notice === "not-staff" && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">The pricing desk is for the Udan team. Here are your own quotes.</p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-udan-charcoal">{customer?.name ? `Hello, ${customer.name.split(" ")[0]}` : "Your quotes"}</h1>
          <p className="text-sm text-udan-gray">Signed in as {user.email}</p>
        </div>
        <Button asChild>
          <Link href="/account/new">Get a new quote</Link>
        </Button>
      </div>

      {(requests ?? []).length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="font-medium">No quote requests yet.</p>
          <p className="mt-1 text-sm text-udan-gray">
            Tell us where you want to go and we will price it against our supplier rates. You can also{" "}
            <a className="underline" href={`${publicEnv.siteUrl}/beat-my-price`}>send us a price you have seen elsewhere</a>.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests!.map((r) => (
            <li key={r.reference}>
              <Link href={`/account/quotes/${r.reference}`} className="block rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-udan-gray">{r.reference}</p>
                    <p className="font-semibold text-udan-charcoal">{tripSummary(r)}</p>
                    <p className="mt-1 text-xs text-udan-gray">Requested {formatDate(r.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={r.status} acceptRequestedAt={r.accept_requested_at} acceptedAt={r.accepted_at} />
                    {r.total_sell_inr != null && !["queued", "pricing", "cancelled"].includes(r.status) && (
                      <p className="mt-2 font-semibold">{formatInr(Number(r.total_sell_inr))}</p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
