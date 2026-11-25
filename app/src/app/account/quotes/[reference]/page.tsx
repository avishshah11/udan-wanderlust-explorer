import { DOCUMENT_TYPE_LABELS, LINE_TYPE_LABELS, OFFICE, PAYMENT_METHOD_LABELS, customerStatus, displayPrice, formatInr, tripSummary } from "@udan/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Tip } from "@/components/tip";
import { requireUser } from "@/lib/auth";
import type { CustomerQuote } from "@/lib/customer-quote";
import { formatDate } from "@/lib/format";
import { loadRates } from "@/lib/fx";
import { typicalPriceFor } from "@/lib/rate-card";
import { acceptQuote } from "./actions";

export const metadata = { title: "Your quote" };

const landline = OFFICE.phones.find((p) => p.label === "Office")!;

/** What to do next, for someone using this page for the first time. */
function NextStepTip({ q }: { q: CustomerQuote }) {
  const waitingPayment = q.payments.some((p) => p.status === "awaiting");
  if (q.status === "queued" || q.status === "pricing") {
    return (
      <Tip id="quote-waiting" title="What happens now">
        <p>Nothing to do for now. We are pricing your trip, and your quote will appear on this page and in your email inbox.</p>
      </Tip>
    );
  }
  if (q.status === "sent") {
    return (
      <Tip id="quote-review" title="How to accept your quote">
        <p>
          Read the list of items, the total, and what is and is not included. If it all looks right, press <strong>Accept this quote</strong> at the
          bottom. Accepting takes no money on this website.
        </p>
        <p>Want something changed? Reply to the quote email and tell us.</p>
      </Tip>
    );
  }
  if (waitingPayment) {
    return (
      <Tip id="quote-pay" title="How to pay">
        <p>
          Pay the amount listed under <strong>Payments</strong> below, using the details in our payment email. After paying, reply to that email with
          your transaction reference (UTR) or a screenshot so we can match your payment. This page will then show it as received.
        </p>
      </Tip>
    );
  }
  if (q.status === "awaiting_payment") {
    return (
      <Tip id="quote-accepted" title="What happens now">
        <p>Look out for an email from Udan Tours and Travels telling you how to pay. Pay only the amount it shows, which will also be listed on this page.</p>
      </Tip>
    );
  }
  if (q.status === "advance_received") {
    return (
      <Tip id="quote-booking" title="What happens now">
        <p>We are making your bookings. Your vouchers and tickets will appear under Travel documents on this page, and we will email you when they are ready.</p>
      </Tip>
    );
  }
  if (q.status === "balance_received") {
    return (
      <Tip id="quote-documents" title="Before you travel">
        <p>Open each travel document below and keep a copy on your phone. A printed copy is handy at airports and hotels.</p>
      </Tip>
    );
  }
  return null;
}

const NOTICES: Record<string, string> = {
  received: "Thank you. We have your request and it is now with our pricing desk.",
  recheck: "Thank you. Because this quote passed its validity date, we are confirming the prices with our suppliers again and will email you the confirmed quote to accept.",
};
const ERRORS: Record<string, string> = {
  accept: "Something went wrong accepting this quote. Please try again, or call us on +91 93762 14442.",
  not_ready: "This quote isn't ready to accept yet.",
  not_found: "We couldn't find that quote in your account.",
};

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { reference } = await params;
  const { notice, error } = await searchParams;
  const { supabase, user } = await requireUser(`/account/quotes/${reference}`);
  const [{ data }, { data: customer }, rates] = await Promise.all([
    supabase.rpc("quote_for_customer", { p_reference: reference }),
    supabase.from("customers").select("display_currency").eq("user_id", user.id).maybeSingle(),
    loadRates(supabase),
  ]);
  const q = data as unknown as CustomerQuote | null;
  if (!q) notFound();

  const currency = customer?.display_currency ?? q.preferred_currency ?? "INR";
  const status = customerStatus({ status: q.status, acceptRequestedAt: q.accept_requested_at, acceptedAt: q.accepted_at, payments: q.payments });
  const canAccept = q.status === "sent" && !q.is_expired;
  const expired = q.status === "sent" && q.is_expired;
  const travelDocs = q.documents.filter((d) => d.type !== "ota_screenshot");

  // While the desk prices it, a typical range from past quotes, if there is one.
  let typical = null;
  if (q.status === "queued" || q.status === "pricing") {
    const { data: own } = await supabase.from("quote_requests").select("destination_slug").eq("reference", q.reference).maybeSingle();
    typical = await typicalPriceFor(supabase, { ...q, destination_slug: own?.destination_slug ?? null });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/account" className="inline-block text-base font-medium text-udan-blue underline underline-offset-4 hover:text-udan-orange">← All my quotes</Link>
      {notice && NOTICES[notice] && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-base text-emerald-900">{NOTICES[notice]}</p>}
      {error && ERRORS[error] && <p role="alert" className="rounded-lg bg-red-50 p-4 text-base text-red-900">{ERRORS[error]}</p>}

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-udan-gray">{q.reference}</p>
            <h1 className="text-2xl font-bold text-udan-charcoal">{tripSummary(q)}</h1>
          </div>
          <StatusBadge status={q.status} acceptRequestedAt={q.accept_requested_at} acceptedAt={q.accepted_at} payments={q.payments} />
        </div>
        <p className="mt-4 rounded-lg bg-udan-lightGray p-4 text-base">
          <strong>{status.label}.</strong> {status.detail}
        </p>
        {typical && (
          <div className="mt-3 rounded-lg border border-udan-orange/30 p-4 text-sm">
            <p>
              <strong>Typical price:</strong> similar trips have cost <Money inr={typical.low} currency={currency} rates={rates} /> to{" "}
              <Money inr={typical.high} currency={currency} rates={rates} />.
            </p>
            <p className="mt-1 text-xs text-udan-gray">{typical.basis} Your quote is priced for your own dates.</p>
          </div>
        )}
      </section>

      <NextStepTip q={q} />

      {q.messages.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Messages from Udan</h2>
          <ul className="space-y-3">
            {q.messages.map((m, i) => (
              <li key={i} className="rounded-lg border-l-4 border-udan-orange bg-udan-lightGray p-4 text-sm">
                <p className="text-xs text-udan-gray">
                  {m.from} · {formatDate(m.sent_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-udan-charcoal">{m.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-udan-gray">To answer, reply to the email we sent you, or call us.</p>
        </section>
      )}

      {q.lines.length > 0 && q.total_inr != null && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">{q.quote_version > 1 ? `Your quote (revision ${q.quote_version})` : "Your quote"}</h2>
          <table className="w-full text-sm">
            <tbody>
              {q.lines.map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-3 text-udan-gray">{LINE_TYPE_LABELS[l.type]}</td>
                  <td className="py-2 pr-3">{l.description}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatInr(Number(l.price_inr))}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 font-semibold" colSpan={2}>Total</td>
                <td className="pt-3 text-right text-lg"><Money inr={Number(q.total_inr)} currency={currency} rates={rates} /></td>
              </tr>
            </tbody>
          </table>
          {displayPrice(Number(q.total_inr), currency, rates).rateNote && (
            <p className="mt-1 text-right text-xs text-udan-gray">{displayPrice(Number(q.total_inr), currency, rates).rateNote}</p>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {q.inclusions && (
              <div>
                <h3 className="text-sm font-semibold">Included</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-udan-gray">{q.inclusions}</p>
              </div>
            )}
            {q.exclusions && (
              <div>
                <h3 className="text-sm font-semibold">Not included</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-udan-gray">{q.exclusions}</p>
              </div>
            )}
          </div>

          {q.valid_until && (
            <p className="mt-5 text-sm">
              {expired ? "This price was valid until " : "This price holds until "}
              <strong>{formatDate(q.valid_until)}</strong>.
            </p>
          )}

          {canAccept && (
            <form action={acceptQuote} className="mt-5 flex flex-wrap items-center gap-4">
              <input type="hidden" name="reference" value={q.reference} />
              <SubmitButton size="lg" pendingText="Confirming…">Accept this quote</SubmitButton>
              <p className="text-xs text-udan-gray">Accepting fixes this price and inclusions. No payment is taken here; we email you payment details.</p>
            </form>
          )}
          {expired && (
            <form action={acceptQuote} className="mt-5 flex flex-wrap items-center gap-4">
              <input type="hidden" name="reference" value={q.reference} />
              <SubmitButton size="lg" variant="outline" pendingText="Sending…">I still want this: please re-check the price</SubmitButton>
            </form>
          )}
          <p className="mt-4 text-xs text-udan-gray">Want something changed? Reply to the quote email and quote {q.reference}; we will re-price it under the same reference.</p>
        </section>
      )}

      {q.payments.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Payments</h2>
          <ul className="space-y-2 text-base">
            {q.payments.map((p, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0">
                <span className="capitalize">{p.kind} · {PAYMENT_METHOD_LABELS[p.method]}</span>
                <span>
                  {formatInr(Number(p.amount))} ·{" "}
                  {p.status === "received" ? (
                    <span className="font-medium text-emerald-700">received {formatDate(p.received_at)}</span>
                  ) : (
                    <span className="font-medium text-orange-700">details emailed {formatDate(p.requested_at)}, waiting for your payment</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-udan-lightGray p-3 text-xs text-udan-gray">
            Pay only the amounts listed here. If anyone asks you to pay for this trip in another way, or for an OTP or PIN, call our office on{" "}
            <a className="text-udan-blue underline" href={`tel:${landline.tel}`}>{landline.display}</a> first.{" "}
            <a className="text-udan-blue underline" href={`${OFFICE.website}/trust#pay-safely`}>How to pay safely</a>
          </p>
        </section>
      )}

      {travelDocs.length > 0 && (
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Travel documents</h2>
          <ul className="space-y-2 text-sm">
            {travelDocs.map((d) => (
              <li key={d.id}>
                <a className="text-udan-blue underline" href={`/account/documents/${d.id}`}>{d.file_name}</a>{" "}
                <span className="text-udan-gray">({DOCUMENT_TYPE_LABELS[d.type]})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
