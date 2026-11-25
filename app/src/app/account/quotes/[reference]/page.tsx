import { DOCUMENT_TYPE_LABELS, LINE_TYPE_LABELS, OFFICE, PAYMENT_METHOD_LABELS, displayPrice, formatInr, tripSummary } from "@udan/core";
import { FileText, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Money } from "@/components/money";
import { ProgressSteps } from "@/components/progress-steps";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { CUSTOMER_STEPS, customerStep, waitingPayment } from "@/lib/customer-next";
import type { CustomerQuote } from "@/lib/customer-quote";
import { formatDate } from "@/lib/format";
import { loadRates } from "@/lib/fx";
import { typicalPriceFor } from "@/lib/rate-card";
import { cn } from "@/lib/utils";
import { acceptQuote } from "./actions";

export const metadata = { title: "Your quote" };

const mobile = OFFICE.phones.find((p) => p.label === "Mobile")!;
const landline = OFFICE.phones.find((p) => p.label === "Office")!;

const NOTICES: Record<string, string> = {
  received: "Thank you. We have your request and it is now with our pricing desk.",
  recheck: "Thank you. Because this quote passed its validity date, we are confirming the prices with our suppliers again and will email you the confirmed quote to accept.",
};
const ERRORS: Record<string, string> = {
  accept: "Something went wrong accepting this quote. Please try again, or call us on +91 93762 14442.",
  not_ready: "This quote isn't ready to accept yet.",
  not_found: "We couldn't find that quote in your account.",
};

function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-white p-5 shadow-sm sm:p-7", className)}>
      {title && <h2 className="mb-4 text-xl font-bold text-udan-charcoal">{title}</h2>}
      {children}
    </section>
  );
}

function AcceptForm({ reference, recheck = false }: { reference: string; recheck?: boolean }) {
  return (
    <form action={acceptQuote}>
      <input type="hidden" name="reference" value={reference} />
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText={recheck ? "Sending…" : "Confirming…"}>
        {recheck ? "Please re-check the price" : "Accept this quote"}
      </SubmitButton>
    </form>
  );
}

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
  const canAccept = q.status === "sent" && !q.is_expired;
  const expired = q.status === "sent" && q.is_expired;
  const recheck = q.status === "pricing" && !!q.accept_requested_at && !q.accepted_at;
  const pay = q.status === "awaiting_payment" || q.status === "advance_received" ? waitingPayment(q) : null;
  const travelDocs = q.documents.filter((d) => d.type !== "ota_screenshot");
  const changeMail = `mailto:${OFFICE.email}?subject=${encodeURIComponent(`Change to my quote ${q.reference}`)}`;

  // While the desk prices it, a typical range from past quotes, if there is one.
  let typical = null;
  if (q.status === "queued" || q.status === "pricing") {
    const { data: own } = await supabase.from("quote_requests").select("destination_slug").eq("reference", q.reference).maybeSingle();
    typical = await typicalPriceFor(supabase, { ...q, destination_slug: own?.destination_slug ?? null });
  }

  // The one thing to do now, in plain words, with its button.
  let next: { title: string; body: React.ReactNode; action?: React.ReactNode; tone: "act" | "wait" | "done" | "stop" };
  if (q.status === "cancelled") {
    next = { tone: "stop", title: "This request was cancelled", body: <p>If you would like to start again, reply to any of our emails or call us.</p> };
  } else if (recheck) {
    next = {
      tone: "wait",
      title: "We are re-checking the prices",
      body: <p>This quote passed its validity date, so we are confirming the prices with our suppliers again. We will email you the confirmed quote to accept.</p>,
    };
  } else if (q.status === "queued" || q.status === "pricing") {
    next = {
      tone: "wait",
      title: "We are pricing your trip",
      body: (
        <>
          <p>Nothing to do for now. A member of our family is checking prices with our suppliers. Your quote will appear on this page and in your email inbox.</p>
          {typical && (
            <p className="mt-3 rounded-xl bg-white/70 p-4">
              <strong>Similar trips have cost</strong> <Money inr={typical.low} currency={currency} rates={rates} /> to{" "}
              <Money inr={typical.high} currency={currency} rates={rates} />. <span className="text-udan-gray">{typical.basis} Your quote is priced for your own dates.</span>
            </p>
          )}
        </>
      ),
    };
  } else if (canAccept) {
    next = {
      tone: "act",
      title: `Your quote is ready: ${formatInr(Number(q.total_inr))}`,
      body: (
        <p>
          Look through the details below. If everything is right, accept it. Accepting takes no money on this website; we then email you how to pay.
          {q.valid_until && (
            <>
              {" "}This price holds until <strong>{formatDate(q.valid_until)}</strong>.
            </>
          )}
        </p>
      ),
      action: (
        <div className="flex flex-col gap-3 sm:flex-row">
          <AcceptForm reference={q.reference} />
          <Button asChild size="lg" variant="outline">
            <a href={changeMail}>Ask for a change</a>
          </Button>
        </div>
      ),
    };
  } else if (expired) {
    next = {
      tone: "act",
      title: "This price has expired",
      body: (
        <p>
          The price was valid until <strong>{formatDate(q.valid_until)}</strong>. If you still want this trip, ask us to re-check it: we confirm the prices
          with our suppliers and email you the quote to accept.
        </p>
      ),
      action: <AcceptForm reference={q.reference} recheck />,
    };
  } else if (pay) {
    const latest = q.payments.filter((p) => p.status === "awaiting").at(-1);
    const method = latest?.method;
    const requested = latest?.requested_at;
    next = {
      tone: "act",
      title: `Pay your ${pay.kind === "balance" ? "balance" : "advance"}: ${formatInr(Number(pay.amount))}`,
      body: (
        <>
          <p>
            We emailed you how to pay{requested ? ` on ${formatDate(requested)}` : ""}
            {method ? `, by ${PAYMENT_METHOD_LABELS[method].toLowerCase()}` : ""}. Use the details in that email.
          </p>
          <p className="mt-2">
            After paying, reply to that email with your transaction reference (UTR) or a screenshot, so we can match your payment. This page will then show
            it as received.
          </p>
        </>
      ),
    };
  } else if (q.status === "awaiting_payment") {
    next = {
      tone: "wait",
      title: "Thank you, you have accepted",
      body: <p>We will email you how to pay your advance. Pay only the amount we ask for, which will also be shown on this page.</p>,
    };
  } else if (q.status === "advance_received") {
    next = {
      tone: "wait",
      title: "Your advance has reached us",
      body: <p>We are making your bookings. Your vouchers and tickets will appear under Travel documents on this page, and we will email you when they are ready.</p>,
    };
  } else {
    next = {
      tone: "done",
      title: "You are all set",
      body: <p>Your trip is fully paid. Your travel documents are below: keep a copy on your phone, and a printed copy is handy at airports and hotels.</p>,
    };
  }

  const toneClass = {
    act: "border-primary bg-orange-50",
    wait: "border-udan-blue bg-blue-50",
    done: "border-emerald-600 bg-emerald-50",
    stop: "border-zinc-400 bg-zinc-100",
  }[next.tone];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/account" className="inline-block text-base font-medium text-udan-blue underline underline-offset-4 hover:text-udan-orange">
        ← All my quotes
      </Link>
      {notice && NOTICES[notice] && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-base text-emerald-900">{NOTICES[notice]}</p>}
      {error && ERRORS[error] && <p role="alert" className="rounded-xl bg-red-50 p-4 text-base text-red-900">{ERRORS[error]}</p>}

      <Section>
        <p className="text-sm text-udan-gray">
          Reference <span className="font-mono font-semibold text-udan-charcoal">{q.reference}</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-udan-charcoal sm:text-3xl">{tripSummary(q)}</h1>
        {q.status !== "cancelled" && (
          <div className="mt-6">
            <ProgressSteps steps={CUSTOMER_STEPS} current={customerStep(q)} label="Your trip so far" />
          </div>
        )}
      </Section>

      <section aria-labelledby="next-step" className={cn("rounded-2xl border-l-8 p-5 shadow-sm sm:p-7", toneClass)}>
        <p className="text-sm font-semibold uppercase tracking-wide text-udan-gray">What to do now</p>
        <h2 id="next-step" className="mt-1 text-2xl font-bold text-udan-charcoal">{next.title}</h2>
        <div className="mt-3 text-lg leading-relaxed text-udan-charcoal">{next.body}</div>
        {next.action && <div className="mt-5">{next.action}</div>}
      </section>

      {q.messages.length > 0 && (
        <Section title="Messages from Udan">
          <ul className="space-y-3">
            {q.messages.map((m, i) => (
              <li key={i} className="rounded-xl border-l-4 border-primary bg-udan-lightGray p-4">
                <p className="text-sm text-udan-gray">
                  {m.from} · {formatDate(m.sent_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-base text-udan-charcoal">{m.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-base text-udan-gray">To answer, reply to the email we sent you, or call us.</p>
        </Section>
      )}

      {q.lines.length > 0 && q.total_inr != null && (
        <Section title={q.quote_version > 1 ? `Your quote (revision ${q.quote_version})` : "Your quote"}>
          <ul className="divide-y">
            {q.lines.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-base font-medium text-udan-charcoal">{l.description}</p>
                  <p className="text-sm text-udan-gray">{LINE_TYPE_LABELS[l.type]}</p>
                </div>
                <p className="whitespace-nowrap text-base">{formatInr(Number(l.price_inr))}</p>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-baseline justify-between gap-4 rounded-xl bg-udan-lightGray p-4">
            <p className="text-lg font-bold">Total</p>
            <p className="text-right text-2xl font-bold">
              <Money inr={Number(q.total_inr)} currency={currency} rates={rates} />
            </p>
          </div>
          {displayPrice(Number(q.total_inr), currency, rates).rateNote && (
            <p className="mt-2 text-right text-sm text-udan-gray">{displayPrice(Number(q.total_inr), currency, rates).rateNote}</p>
          )}

          {(q.inclusions || q.exclusions) && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {q.inclusions && (
                <div className="rounded-xl border border-emerald-200 p-4">
                  <h3 className="text-base font-bold text-emerald-800">Included</h3>
                  <p className="mt-1 whitespace-pre-wrap text-base">{q.inclusions}</p>
                </div>
              )}
              {q.exclusions && (
                <div className="rounded-xl border border-zinc-200 p-4">
                  <h3 className="text-base font-bold text-udan-charcoal">Not included</h3>
                  <p className="mt-1 whitespace-pre-wrap text-base">{q.exclusions}</p>
                </div>
              )}
            </div>
          )}

          {(canAccept || expired) && (
            <div className="mt-6 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center">
              <AcceptForm reference={q.reference} recheck={expired} />
              <p className="text-base text-udan-gray">
                Want something changed?{" "}
                <a className="font-medium text-udan-blue underline" href={changeMail}>
                  Email us
                </a>{" "}
                and we will re-price it under the same reference.
              </p>
            </div>
          )}
        </Section>
      )}

      {q.payments.length > 0 && (
        <Section title="Payments">
          <ul className="space-y-3">
            {q.payments.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div>
                  <p className="text-lg font-bold">{formatInr(Number(p.amount))}</p>
                  <p className="text-base text-udan-gray">
                    {p.kind === "balance" ? "Balance" : "Advance"} · {PAYMENT_METHOD_LABELS[p.method]}
                  </p>
                </div>
                {p.status === "received" ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-base font-semibold text-emerald-800">Received {formatDate(p.received_at)}</span>
                ) : (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-base font-semibold text-orange-800">
                    Waiting for your payment · details emailed {formatDate(p.requested_at)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-base text-amber-950">
            <strong>Pay safely.</strong> Pay only the amounts listed here. If anyone asks you to pay for this trip in another way, or for an OTP or PIN, call
            our office on{" "}
            <a className="font-semibold underline" href={`tel:${landline.tel}`}>
              {landline.display}
            </a>{" "}
            first.{" "}
            <a className="font-semibold underline" href={`${OFFICE.website}/trust#pay-safely`}>
              How to pay safely
            </a>
          </p>
        </Section>
      )}

      {travelDocs.length > 0 && (
        <Section title="Travel documents">
          <ul className="space-y-3">
            {travelDocs.map((d) => (
              <li key={d.id}>
                <a
                  className="flex items-center gap-3 rounded-xl border p-4 text-base font-medium text-udan-blue hover:bg-udan-lightGray"
                  href={`/account/documents/${d.id}`}
                >
                  <FileText aria-hidden className="size-6 shrink-0" />
                  <span>
                    {d.file_name}
                    <span className="block text-sm font-normal text-udan-gray">{DOCUMENT_TYPE_LABELS[d.type]}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Questions? We are here to help">
        <p className="text-base text-udan-gray">Mention your reference {q.reference}.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="outline">
            <a href={`tel:${mobile.tel}`}>
              <Phone aria-hidden /> Call {mobile.display}
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={`mailto:${OFFICE.email}?subject=${encodeURIComponent(q.reference)}`}>
              <Mail aria-hidden /> Email us
            </a>
          </Button>
        </div>
      </Section>
    </div>
  );
}
