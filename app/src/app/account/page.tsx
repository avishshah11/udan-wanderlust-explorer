import { formatInr, tripSummary } from "@udan/core";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Tip } from "@/components/tip";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { nextStepLine } from "@/lib/customer-next";
import { publicEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";

export const metadata = { title: "My quotes" };

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const { supabase, user } = await requireUser("/account");
  const [{ data: customer }, { data: requests }, { data: isStaff }] = await Promise.all([
    supabase.from("customers").select("id, name").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("quote_requests")
      .select("reference, status, request_type, destination, origin_city, nights, adults, children, rooms, hotel_tier, cabin_class, start_date, end_date, travel_month, total_sell_inr, valid_until, accepted_at, accept_requested_at, created_at, payments(kind, amount, status), customers!inner(user_id)")
      // Only this person's own requests: staff may read every request, so the
      // access rules alone would list all customers' requests here.
      .eq("customers.user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("is_staff"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {isStaff === true && (
        <p className="rounded-lg bg-blue-50 p-4 text-base text-blue-950">
          You are on the Udan team. Every customer&apos;s quotes are on the{" "}
          <Link className="font-semibold underline" href="/desk?view=all">
            Pricing desk
          </Link>
          ; this page lists only quotes you asked for yourself.
        </p>
      )}
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

      <Tip id="account-list" title="Your quotes in one place">
        <p>Every trip you ask us about is listed here with its status. Press a trip to see its details, your quote and what to do next.</p>
      </Tip>

      {(requests ?? []).length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-xl font-bold">No quote requests yet</p>
          <p className="mx-auto mt-2 max-w-md text-base text-udan-gray">
            Tell us where you want to go and we will price it against our supplier rates. You can also{" "}
            <a className="underline" href={`${publicEnv.siteUrl}/beat-my-price`}>send us a price you have seen elsewhere</a>.
          </p>
          <Button asChild size="lg" className="mt-5">
            <Link href="/account/new">Get a new quote</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests!.map((r) => (
            <li key={r.reference}>
              <Link
                href={`/account/quotes/${r.reference}`}
                className="flex items-center gap-4 rounded-2xl border-2 border-transparent bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <StatusBadge status={r.status} acceptRequestedAt={r.accept_requested_at} acceptedAt={r.accepted_at} payments={r.payments} />
                    {r.total_sell_inr != null && !["queued", "pricing", "cancelled"].includes(r.status) && (
                      <span className="text-lg font-bold text-udan-charcoal">{formatInr(Number(r.total_sell_inr))}</span>
                    )}
                  </div>
                  <p className="text-lg font-bold leading-snug text-udan-charcoal">{tripSummary(r)}</p>
                  <p className="text-base font-medium text-primary">{nextStepLine(r)}</p>
                  <p className="text-sm text-udan-gray">
                    {r.reference} · requested {formatDate(r.created_at)}
                  </p>
                </div>
                <ChevronRight aria-hidden className="size-7 shrink-0 text-udan-gray" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
