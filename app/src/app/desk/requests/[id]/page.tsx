import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  FLEXIBILITY_LABELS,
  INCLUSION_LABELS,
  type Inclusion,
  LINE_TYPES,
  LINE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  findRate,
  formatInr,
  quoteMargin,
  travelWhen,
  tripSummary,
  REQUEST_TYPE_LABELS,
  CABIN_CLASS_LABELS,
} from "@udan/core";
import { notFound } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { requireStaff } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { ageText, defaultValidUntilInput, formatDateTime, localTimeIn } from "@/lib/format";
import { loadRates } from "@/lib/fx";
import { DeskStatus } from "../../desk-status";
import {
  addLine,
  cancelRequest,
  deleteLine,
  markPaymentReceived,
  notifyDocuments,
  reopenQuote,
  requestPayment,
  sendMessage,
  sendQuote,
  startPricing,
  updateLine,
  uploadDocument,
} from "./actions";

export const metadata = { title: "Request" };

const select = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm";

function Panel({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-udan-charcoal">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-0">
      <span className="text-udan-gray">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

/**
 * The payment form starts on the method whose details are set in the
 * environment (bank first), pre-filled with those details, so a UPI ID is
 * never sent under "Bank transfer".
 */
function paymentDefaults(bank: string | undefined, upi: string | undefined) {
  if (!bank && upi) return { method: "upi", instructions: upi };
  return { method: "bank", instructions: bank ?? "" };
}

export default async function DeskRequest({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  const { supabase } = await requireStaff(`/desk/requests/${id}`);

  const { data: r } = await supabase
    .from("quote_requests")
    .select("*, customers(*), destinations(name, destination_group, typical_inclusions), staff(name)")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();

  const [{ data: lines }, { data: payments }, { data: documents }, { data: activity }, { data: rules }, { data: messages }, rates] = await Promise.all([
    supabase.from("quote_lines").select("*").eq("request_id", id).order("position").order("created_at"),
    supabase.from("payments").select("*").eq("request_id", id).order("requested_at"),
    supabase.from("documents").select("*").eq("request_id", id).order("uploaded_at"),
    supabase.from("audit_log").select("at, action, detail").eq("request_id", id).order("at", { ascending: false }).limit(40),
    supabase.from("markup_rules").select("destination_group, product_type, markup_pct").eq("active", true),
    supabase.from("request_messages").select("id, body, created_at, staff(name)").eq("request_id", id).order("created_at"),
    loadRates(supabase),
  ]);

  const docUrls = new Map<string, string>();
  if (documents && documents.length > 0) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrls(documents.map((d) => d.storage_path), 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) docUrls.set(s.path, s.signedUrl);
  }

  const c = r.customers!;
  const group = r.destinations?.destination_group ?? null;
  const applicableRules = (rules ?? []).filter((x) => x.destination_group === null || x.destination_group === group);
  const priced = (lines ?? []).map((l) => ({ netCost: Number(l.net_cost), sellPrice: Number(l.sell_price) }));
  const margin = quoteMargin(priced);
  const payDefaults = paymentDefaults(serverEnv.paymentDetailsBank, serverEnv.paymentDetailsUpi);
  const frozen = r.accepted_at !== null;
  const ota = r.ota_comparison as { ota_name?: string; product_name?: string; room_type?: string; price?: number; currency?: string } | null;
  const otaRate = ota?.currency ? findRate(rates, ota.currency) : null;
  const otaInr = ota?.price != null ? (ota.currency === "INR" || !ota.currency ? ota.price : otaRate ? ota.price * otaRate.inrPerUnit : null) : null;
  const requested = (Array.isArray(r.requested_items) ? r.requested_items : []) as { type?: string; description?: string; city?: string; nights?: number }[];
  const local = localTimeIn(c.time_zone);
  const defaultInclusions = r.inclusions ?? (r.destinations?.typical_inclusions ?? []).join("\n");

  return (
    <div className="space-y-5">
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-5 shadow-sm">
        <div>
          <p className="font-mono text-sm text-udan-gray">{r.reference}</p>
          <p className="text-xl font-semibold">{tripSummary(r)}</p>
          <p className="mt-1 text-sm text-udan-gray">
            {REQUEST_TYPE_LABELS[r.request_type]} · {r.channel} request · received {formatDateTime(r.created_at)} ({ageText(r.created_at)} ago)
            {r.staff?.name ? ` · assigned to ${r.staff.name}` : ""}
            {r.quote_version > 0 ? ` · quote v${r.quote_version}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DeskStatus status={r.status} acceptRequestedAt={r.accept_requested_at} acceptedAt={r.accepted_at} />
          {r.status === "queued" && (
            <form action={startPricing}>
              <input type="hidden" name="id" value={id} />
              <SubmitButton size="sm">Start pricing</SubmitButton>
            </form>
          )}
          {!["cancelled", "advance_received", "balance_received"].includes(r.status) && (
            <form action={cancelRequest}>
              <input type="hidden" name="id" value={id} />
              <SubmitButton size="sm" variant="outline">Cancel request</SubmitButton>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Customer">
          <Field label="Name">{c.name ?? "not given"}</Field>
          <Field label="Email">
            <a className="text-udan-blue underline" href={`mailto:${c.email}?subject=${encodeURIComponent(r.reference)}`}>{c.email}</a>
            {!c.email_verified_at && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">not signed in yet</span>}
          </Field>
          <Field label="Phone">{c.phone ? <a className="text-udan-blue underline" href={`tel:${c.phone.replace(/\s+/g, "")}`}>{c.phone}</a> : "not given"}</Field>
          <Field label="Local time">{local ? `${local} (${c.time_zone})` : "time zone unknown"}</Field>
          <Field label="Country / currency">{[c.country, c.display_currency].filter(Boolean).join(" · ")}</Field>
          <Field label="Alerts">Email{c.alert_whatsapp ? ", WhatsApp (not connected)" : ""}{c.alert_sms ? ", SMS (not connected)" : ""}</Field>
        </Panel>

        <Panel title="What they asked for">
          <Field label="Type">{REQUEST_TYPE_LABELS[r.request_type]}</Field>
          <Field label={r.request_type === "flights" ? "Flying to" : r.request_type === "hotels" ? "City or area" : "Destination"}>
            {r.destination}{r.destinations ? ` · group ${group}` : " · no catalogue match"}
          </Field>
          {r.origin_city && <Field label={r.request_type === "flights" ? "Flying from" : "From"}>{r.origin_city}</Field>}
          <Field label={r.request_type === "flights" ? "Departure" : r.request_type === "hotels" ? "Check-in" : "When"}>
            {travelWhen(r)} · {FLEXIBILITY_LABELS[r.flexibility]}
          </Field>
          {r.request_type === "flights" && <Field label="Return">{r.end_date ? travelWhen({ start_date: r.end_date }) : "One way"}</Field>}
          {r.request_type === "hotels" && r.end_date && (
            <Field label="Check-out">{travelWhen({ start_date: r.end_date })}{r.nights ? ` · ${r.nights} night${r.nights === 1 ? "" : "s"}` : ""}</Field>
          )}
          {r.cabin_class && <Field label="Cabin">{CABIN_CLASS_LABELS[r.cabin_class]}</Field>}
          {r.rooms && <Field label="Rooms">{r.rooms}</Field>}
          <Field label="Party">{r.adults} adults{r.children ? `, ${r.children} children${r.child_ages.length ? ` (ages ${r.child_ages.join(", ")})` : ""}` : ""}</Field>
          <Field label="Budget">
            {r.budget_min != null || r.budget_max != null
              ? `${r.budget_currency} ${Number(r.budget_min ?? 0).toLocaleString("en-IN")} – ${Number(r.budget_max ?? 0).toLocaleString("en-IN")}`
              : "not given"}
          </Field>
          {r.inclusions_wanted.length > 0 && (
            <Field label="Wants">{r.inclusions_wanted.map((i) => INCLUSION_LABELS[i as Inclusion] ?? i).join(", ")}</Field>
          )}
          {requested.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-udan-gray">Itinerary items</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {requested.map((item, i) => (
                  <li key={i}>
                    {item.type ? `${item.type}: ` : ""}
                    {item.description}
                    {item.city ? ` (${item.city})` : ""}
                    {item.nights ? `, ${item.nights}N` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.customer_notes && <p className="mt-3 whitespace-pre-wrap rounded-md bg-udan-lightGray p-3 text-sm">{r.customer_notes}</p>}
          {ota && (
            <div className="mt-3 rounded-md border border-dashed p-3 text-sm">
              <p className="font-medium">Price to beat: {ota.ota_name}</p>
              <p>
                {ota.product_name}
                {ota.room_type ? `, ${ota.room_type}` : ""}: {ota.currency ?? "INR"} {Number(ota.price).toLocaleString("en-IN")}
                {otaInr != null && ota.currency !== "INR" ? ` (≈ ${formatInr(otaInr)})` : ""}
              </p>
              {otaInr != null && margin.sell > 0 && (
                <p className={margin.sell <= otaInr ? "text-emerald-700" : "text-red-700"}>
                  Our current total {formatInr(margin.sell)} is {formatInr(Math.abs(otaInr - margin.sell))}{" "}
                  {margin.sell <= otaInr ? `below (${Math.round(((otaInr - margin.sell) / otaInr) * 100)}% saving)` : "above"} the OTA price.
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Messages to the customer">
        {(messages ?? []).length > 0 ? (
          <ul className="mb-4 space-y-2">
            {messages!.map((m) => (
              <li key={m.id} className="rounded-lg bg-udan-lightGray p-3 text-sm">
                <p className="text-xs text-udan-gray">
                  {m.staff?.name ?? "A former team member"} · {formatDateTime(m.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-udan-gray">No messages yet.</p>
        )}
        <form action={sendMessage} className="space-y-2">
          <input type="hidden" name="id" value={id} />
          <Label htmlFor="message">Write to {c.name ?? c.email}</Label>
          <Textarea
            id="message"
            name="message"
            rows={4}
            required
            maxLength={4000}
            placeholder="Ask about their trip, explain something in the quote, or give them an update."
          />
          <p className="text-xs text-udan-gray">
            Emailed to {c.email} and shown in their account. Messages can&apos;t be edited once sent.{" "}
            {serverEnv.emailReplyTo
              ? `Their replies go to ${serverEnv.emailReplyTo}.`
              : "Their replies go to the sending address until EMAIL_REPLY_TO is set."}
          </p>
          <SubmitButton pendingText="Sending…">Send message</SubmitButton>
        </form>
      </Panel>

      <Panel
        title="Priced lines"
        aside={frozen ? <span className="text-sm text-udan-gray">Accepted {formatDateTime(r.accepted_at)}: lines are frozen</span> : null}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-udan-gray">
              <tr>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2">Description (customer sees this)</th>
                <th className="py-2 pr-2">Supplier ref</th>
                <th className="py-2 pr-2 text-right">Net ₹</th>
                <th className="py-2 pr-2 text-right">Markup</th>
                <th className="py-2 pr-2 text-right">Sell</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(lines ?? []).map((l) => (
                <tr key={l.id} className="border-b align-top">
                  <td className="py-2 pr-2">{LINE_TYPE_LABELS[l.type]}</td>
                  {frozen ? (
                    <>
                      <td className="py-2 pr-2">{l.description}</td>
                      <td className="py-2 pr-2 text-udan-gray">{l.supplier_ref}</td>
                      <td className="py-2 pr-2 text-right">{formatInr(Number(l.net_cost))}</td>
                      <td className="py-2 pr-2 text-right">{Number(l.markup_pct)}%{l.markup_overridden ? " *" : ""}</td>
                      <td className="py-2 pr-2 text-right font-medium">{formatInr(Number(l.sell_price))}</td>
                      <td />
                    </>
                  ) : (
                    <>
                      <td className="py-2 pr-2" colSpan={5}>
                        <form action={updateLine} className="grid grid-cols-[1fr_8rem_7rem_6rem_7rem_auto] items-center gap-2">
                          <input type="hidden" name="id" value={id} />
                          <input type="hidden" name="line_id" value={l.id} />
                          <Input name="description" defaultValue={l.description} aria-label="Description" />
                          <Input name="supplier_ref" defaultValue={l.supplier_ref ?? ""} aria-label="Supplier reference" />
                          <Input name="net_cost" defaultValue={Number(l.net_cost)} inputMode="decimal" className="text-right" aria-label="Net cost" />
                          <Input
                            name="markup_override"
                            defaultValue={l.markup_overridden ? Number(l.markup_pct) : ""}
                            placeholder={`${Number(l.markup_pct)}%`}
                            inputMode="decimal"
                            className="text-right"
                            aria-label="Markup override %"
                          />
                          <span className="text-right font-medium">{formatInr(Number(l.sell_price))}</span>
                          <SubmitButton size="sm" variant="outline">Save</SubmitButton>
                        </form>
                      </td>
                      <td className="py-2">
                        <form action={deleteLine}>
                          <input type="hidden" name="id" value={id} />
                          <input type="hidden" name="line_id" value={l.id} />
                          <SubmitButton size="sm" variant="ghost" aria-label="Remove line">✕</SubmitButton>
                        </form>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-6 text-sm">
          <span>Net {formatInr(margin.net)}</span>
          <span>Margin {formatInr(margin.margin)}{margin.marginPct != null ? ` (${margin.marginPct}%)` : ""}</span>
          <span className="font-semibold">Customer total {formatInr(margin.sell)}</span>
        </div>
        <p className="mt-1 text-right text-xs text-udan-gray">* markup overridden on this quote (logged)</p>

        {!frozen && r.status !== "cancelled" && (
          <form action={addLine} className="mt-5 grid gap-3 rounded-lg bg-udan-lightGray p-4 md:grid-cols-[9rem_1fr_9rem_8rem_8rem_auto] md:items-end">
            <input type="hidden" name="id" value={id} />
            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" className={select} defaultValue="hotel">
                {LINE_TYPES.map((t) => <option key={t} value={t}>{LINE_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Ubud, 3 nights, deluxe room with breakfast" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="supplier_ref">Supplier ref</Label>
              <Input id="supplier_ref" name="supplier_ref" placeholder="internal" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="net_cost">Net cost ₹</Label>
              <Input id="net_cost" name="net_cost" inputMode="decimal" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="markup_override">Markup %</Label>
              <Input id="markup_override" name="markup_override" inputMode="decimal" placeholder="rule" />
            </div>
            <SubmitButton>Add line</SubmitButton>
            <p className="text-xs text-udan-gray md:col-span-6">
              Leave markup blank to use the rule.{" "}
              {applicableRules.length > 0
                ? `Rules for ${group ?? "this request"}: ${applicableRules
                    .map((x) => `${x.product_type ?? "any type"}${x.destination_group ? "" : " (all groups)"} ${Number(x.markup_pct)}%`)
                    .join(" · ")}.`
                : "No markup rules apply yet, so enter a markup for each line."}
            </p>
          </form>
        )}
      </Panel>

      {!frozen && r.status !== "cancelled" && (
        <Panel title={r.quote_version > 0 ? "Send a revised quote" : "Send the quote"}>
          <form action={sendQuote} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            <div className="space-y-1 md:col-span-2 md:max-w-xs">
              <Label htmlFor="valid_until">Price valid until (end of day, IST)</Label>
              <Input id="valid_until" name="valid_until" type="date" defaultValue={defaultValidUntilInput()} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inclusions">Included (one per line)</Label>
              <Textarea id="inclusions" name="inclusions" rows={5} defaultValue={defaultInclusions} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exclusions">Not included</Label>
              <Textarea id="exclusions" name="exclusions" rows={5} defaultValue={r.exclusions ?? ""} />
            </div>
            <div className="md:col-span-2">
              <SubmitButton disabled={(lines ?? []).length === 0} pendingText="Sending…">
                {r.quote_version > 0 ? "Send revised quote" : "Send quote"} for {formatInr(margin.sell)}
              </SubmitButton>
              <p className="mt-2 text-xs text-udan-gray">
                Goes to the customer&apos;s account, their inbox and any alert channel they turned on. Customers never see net cost, markup or supplier refs.
              </p>
            </div>
          </form>
        </Panel>
      )}

      {r.status === "sent" && (
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
          Sent {formatDateTime(r.sent_at)} · valid until {formatDateTime(r.valid_until)} · total {formatInr(Number(r.total_sell_inr))}. Changing lines and sending again creates a revision under the same reference.
        </p>
      )}

      {frozen && (
        <Panel
          title="Payments"
          aside={
            r.status === "awaiting_payment" ? (
              <form action={reopenQuote}>
                <input type="hidden" name="id" value={id} />
                <SubmitButton size="sm" variant="outline">Reopen for revision</SubmitButton>
              </form>
            ) : null
          }
        >
          {(payments ?? []).length > 0 && (
            <table className="mb-4 w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-udan-gray">
                <tr><th className="py-2">Kind</th><th>Amount</th><th>Method</th><th>Status</th><th>Note</th><th /></tr>
              </thead>
              <tbody>
                {payments!.map((p) => (
                  <tr key={p.id} className="border-b align-top">
                    <td className="py-2 capitalize">{p.kind}</td>
                    <td>{formatInr(Number(p.amount))}</td>
                    <td>{PAYMENT_METHOD_LABELS[p.method]}</td>
                    <td>{p.status === "received" ? `Received ${formatDateTime(p.received_at)}` : `Awaiting since ${formatDateTime(p.requested_at)}`}</td>
                    <td className="text-udan-gray">{p.note}</td>
                    <td className="py-2">
                      {p.status === "awaiting" && (
                        <form action={markPaymentReceived} className="flex gap-2">
                          <input type="hidden" name="id" value={id} />
                          <input type="hidden" name="payment_id" value={p.id} />
                          <Input name="note" placeholder="UTR / reference" className="h-9 w-36" />
                          <SubmitButton size="sm">Mark received</SubmitButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={requestPayment} className="grid gap-3 rounded-lg bg-udan-lightGray p-4 md:grid-cols-4">
            <input type="hidden" name="id" value={id} />
            <p className="text-sm font-medium md:col-span-4">Send payment details</p>
            <div className="space-y-1">
              <Label htmlFor="kind">For</Label>
              <select id="kind" name="kind" className={select} defaultValue={(payments ?? []).some((p) => p.kind === "advance") ? "balance" : "advance"}>
                <option value="advance">Advance</option>
                <option value="balance">Balance</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Amount ₹</Label>
              <Input id="amount" name="amount" inputMode="decimal" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="method">Method</Label>
              <select id="method" name="method" className={select} defaultValue={payDefaults.method}>
                <option value="bank">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="card_link">Card link (Razorpay dashboard)</option>
                <option value="cash">Cash at office (no email)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="card_link">Card link (for card)</Label>
              <Input id="card_link" name="card_link" type="url" placeholder="https://rzp.io/…" />
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="instructions">Bank or UPI details shown to the customer</Label>
              <Textarea
                id="instructions"
                name="instructions"
                rows={4}
                defaultValue={payDefaults.instructions}
                placeholder={"Account name:\nBank and branch:\nAccount number:\nIFSC:"}
              />
            </div>
            <div className="md:col-span-4">
              <SubmitButton>Email payment details</SubmitButton>
            </div>
          </form>
        </Panel>
      )}

      <Panel
        title="Documents"
        aside={
          (documents ?? []).some((d) => d.type !== "ota_screenshot") ? (
            <form action={notifyDocuments}>
              <input type="hidden" name="id" value={id} />
              <SubmitButton size="sm" variant="outline">Email: documents ready</SubmitButton>
            </form>
          ) : null
        }
      >
        {(documents ?? []).length > 0 ? (
          <ul className="mb-4 space-y-1 text-sm">
            {documents!.map((d) => (
              <li key={d.id}>
                <span className="text-udan-gray">{DOCUMENT_TYPE_LABELS[d.type]}:</span>{" "}
                {docUrls.get(d.storage_path) ? (
                  <a className="text-udan-blue underline" href={docUrls.get(d.storage_path)} target="_blank" rel="noreferrer">{d.file_name}</a>
                ) : (
                  d.file_name
                )}{" "}
                <span className="text-xs text-udan-gray">{formatDateTime(d.uploaded_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-udan-gray">No documents yet.</p>
        )}
        <form action={uploadDocument} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <div className="space-y-1">
            <Label htmlFor="doc_type">Type</Label>
            <select id="doc_type" name="type" className={select} defaultValue="voucher">
              {DOCUMENT_TYPES.filter((t) => t !== "ota_screenshot").map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="file">File (PDF or image, up to 10 MB)</Label>
            <Input id="file" name="file" type="file" accept="application/pdf,image/*" required />
          </div>
          <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
        </form>
      </Panel>

      <Panel title="Activity">
        <ul className="space-y-1 text-sm">
          {(activity ?? []).map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-28 shrink-0 text-udan-gray">{formatDateTime(a.at)}</span>
              <span>
                {a.action.replace(/_/g, " ")}
                <span className="ml-2 font-mono text-xs text-udan-gray">{JSON.stringify(a.detail).slice(0, 160)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
