"use server";

import {
  DOCUMENT_TYPES,
  type DocumentType,
  LINE_TYPES,
  type LineType,
  MarkupError,
  type MarkupRule,
  PAYMENT_KINDS,
  PAYMENT_METHODS,
  type PaymentKind,
  type PaymentMethod,
  deskMessageEmail,
  displayPrice,
  documentsReadyEmail,
  formatInr,
  paymentDetailsEmail,
  paymentReceivedEmail,
  priceLine,
  quoteReadyEmail,
  tripSummary,
} from "@udan/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireStaff } from "@/lib/auth";
import { endOfDayIst } from "@/lib/format";
import { loadRates } from "@/lib/fx";
import { notifyCustomerById, quotePath } from "@/lib/notify";
import type { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;

function done(id: string, params: Record<string, string>): never {
  revalidatePath(`/desk/requests/${id}`);
  redirect(`/desk/requests/${id}?${new URLSearchParams(params).toString()}`);
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function amount(fd: FormData, key: string): number | null {
  const raw = str(fd, key).replace(/[,₹\s]/g, "");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : Number.NaN;
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

async function markupContext(supabase: Supa, requestId: string) {
  const { data: req } = await supabase
    .from("quote_requests")
    .select("destination_slug, destinations(destination_group)")
    .eq("id", requestId)
    .single();
  const { data: rules } = await supabase.from("markup_rules").select("id, destination_group, product_type, markup_pct, active");
  return {
    destinationGroup: req?.destinations?.destination_group ?? null,
    rules: (rules ?? []).map(
      (r): MarkupRule => ({
        id: r.id,
        destinationGroup: r.destination_group,
        productType: r.product_type,
        markupPct: Number(r.markup_pct),
        active: r.active,
      }),
    ),
  };
}

export async function startPricing(fd: FormData) {
  const id = str(fd, "id");
  const { supabase, user } = await requireStaff(`/desk/requests/${id}`);
  const { error } = await supabase
    .from("quote_requests")
    .update({ status: "pricing", pricing_started_at: new Date().toISOString(), assigned_to: user.id })
    .eq("id", id)
    .eq("status", "queued");
  if (error) done(id, { error: error.message });
  done(id, { notice: "Marked as being priced and assigned to you." });
}

export async function addLine(fd: FormData) {
  const id = str(fd, "id");
  const { supabase } = await requireStaff(`/desk/requests/${id}`);
  const type = oneOf<LineType>(str(fd, "type"), LINE_TYPES);
  const description = str(fd, "description");
  const netCost = amount(fd, "net_cost");
  const override = amount(fd, "markup_override");
  if (!type || !description || netCost === null || Number.isNaN(netCost)) {
    done(id, { error: "Each line needs a type, a description and a net cost in rupees." });
  }
  if (Number.isNaN(override)) done(id, { error: "Markup override must be a number, or leave it blank to use the rule." });

  const ctx = await markupContext(supabase, id);
  let priced;
  try {
    priced = priceLine({ netCost: netCost!, productType: type!, destinationGroup: ctx.destinationGroup, rules: ctx.rules, overrideMarkupPct: override });
  } catch (e) {
    done(id, { error: e instanceof MarkupError ? e.message : "Could not price this line." });
  }
  const { count } = await supabase.from("quote_lines").select("id", { count: "exact", head: true }).eq("request_id", id);
  const { error } = await supabase.from("quote_lines").insert({
    request_id: id,
    position: (count ?? 0) + 1,
    type: type!,
    description,
    net_cost: priced!.netCost,
    markup_pct: priced!.markupPct,
    markup_rule_id: priced!.ruleId,
    markup_overridden: priced!.overridden,
    supplier_ref: str(fd, "supplier_ref") || null,
  });
  if (error) done(id, { error: error.message });
  done(id, { notice: `Line added: ${formatInr(priced!.sellPrice)} at ${priced!.markupPct}%${priced!.overridden ? " (override, logged)" : ""}.` });
}

export async function updateLine(fd: FormData) {
  const id = str(fd, "id");
  const lineId = str(fd, "line_id");
  const { supabase } = await requireStaff(`/desk/requests/${id}`);
  const { data: line } = await supabase.from("quote_lines").select("type").eq("id", lineId).single();
  const netCost = amount(fd, "net_cost");
  const override = amount(fd, "markup_override");
  if (!line || netCost === null || Number.isNaN(netCost) || Number.isNaN(override)) {
    done(id, { error: "Enter the net cost in rupees, and a markup % or leave it blank to use the rule." });
  }
  const ctx = await markupContext(supabase, id);
  let priced;
  try {
    priced = priceLine({ netCost: netCost!, productType: line!.type, destinationGroup: ctx.destinationGroup, rules: ctx.rules, overrideMarkupPct: override });
  } catch (e) {
    done(id, { error: e instanceof MarkupError ? e.message : "Could not price this line." });
  }
  const { error } = await supabase
    .from("quote_lines")
    .update({
      net_cost: priced!.netCost,
      markup_pct: priced!.markupPct,
      markup_rule_id: priced!.ruleId,
      markup_overridden: priced!.overridden,
      description: str(fd, "description") || undefined,
      supplier_ref: str(fd, "supplier_ref") || null,
    })
    .eq("id", lineId);
  if (error) done(id, { error: error.message });
  done(id, { notice: "Line updated." });
}

export async function deleteLine(fd: FormData) {
  const id = str(fd, "id");
  const { supabase } = await requireStaff(`/desk/requests/${id}`);
  const { error } = await supabase.from("quote_lines").delete().eq("id", str(fd, "line_id"));
  if (error) done(id, { error: error.message });
  done(id, { notice: "Line removed." });
}

export async function sendQuote(fd: FormData) {
  const id = str(fd, "id");
  const { supabase } = await requireStaff(`/desk/requests/${id}`);
  const validDate = str(fd, "valid_until");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validDate)) done(id, { error: "Choose the date this price is valid until." });

  const { data: sent, error } = await supabase.rpc("send_quote", {
    p_request_id: id,
    p_valid_until: endOfDayIst(validDate),
    p_inclusions: str(fd, "inclusions"),
    p_exclusions: str(fd, "exclusions"),
  });
  if (error) done(id, { error: error.message });

  const [{ data: req }, { data: lines }, rates] = await Promise.all([
    supabase.from("quote_requests").select("*, customers(id, name, display_currency)").eq("id", id).single(),
    supabase.from("quote_lines").select("type, description, sell_price, position").eq("request_id", id).order("position"),
    loadRates(supabase),
  ]);
  if (req?.customers && req.total_sell_inr != null && req.valid_until) {
    const customer = req.customers;
    const validUntil = req.valid_until;
    const render = (accountUrl: string) =>
      quoteReadyEmail({
        name: customer.name,
        reference: req.reference,
        tripSummary: tripSummary(req),
        lines: (lines ?? []).map((l) => ({ type: l.type, description: l.description, price: formatInr(Number(l.sell_price)) })),
        total: displayPrice(Number(req.total_sell_inr), customer.display_currency, rates),
        validUntil,
        inclusions: req.inclusions,
        exclusions: req.exclusions,
        quoteUrl: accountUrl,
        revision: req.quote_version > 1,
      });
    after(() => notifyCustomerById(customer.id, id, "quote_ready", quotePath(req.reference), render));
  }
  const version = (sent as { quote_version?: number } | null)?.quote_version ?? 1;
  done(id, { notice: `Quote sent (version ${version}). The customer has it in their account and inbox.` });
}

export async function reopenQuote(fd: FormData) {
  const id = str(fd, "id");
  const { supabase } = await requireStaff(`/desk/requests/${id}`);
  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("request_id", id)
    .eq("status", "received");
  if ((count ?? 0) > 0) done(id, { error: "A payment has been received on this quote, so it cannot be reopened here. Talk to the customer first." });
  const { error } = await supabase
    .from("quote_requests")
    .update({ accepted_at: null, status: "pricing" })
    .eq("id", id)
    .eq("status", "awaiting_payment");
  if (error) done(id, { error: error.message });
  done(id, { notice: "Quote reopened for revision. Send it again when the lines are updated." });
}

export async function cancelRequest(fd: FormData) {
  const id = str(fd, "id");
  const { supabase } = await requireStaff(`/desk/requests/${id}`);
  const { error } = await supabase
    .from("quote_requests")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) done(id, { error: error.message });
  done(id, { notice: "Request cancelled." });
}

export async function requestPayment(fd: FormData) {
  const id = str(fd, "id");
  const { supabase, user } = await requireStaff(`/desk/requests/${id}`);
  const kind = oneOf<PaymentKind>(str(fd, "kind"), PAYMENT_KINDS);
  const method = oneOf<PaymentMethod>(str(fd, "method"), PAYMENT_METHODS);
  const value = amount(fd, "amount");
  const instructions = str(fd, "instructions");
  const cardLink = str(fd, "card_link");
  if (!kind || !method || value === null || Number.isNaN(value) || value <= 0) {
    done(id, { error: "Choose advance or balance, a method, and an amount in rupees." });
  }
  if ((method === "bank" || method === "upi") && !instructions) done(id, { error: "Paste the bank or UPI details the customer should pay to." });
  if (method === "card_link" && !/^https:\/\//.test(cardLink)) done(id, { error: "Paste the https payment link from the Razorpay dashboard." });

  const { data: req } = await supabase.from("quote_requests").select("reference, customer_id, customers(name)").eq("id", id).single();
  if (!req) done(id, { error: "Request not found." });
  const { error } = await supabase.from("payments").insert({
    request_id: id,
    kind: kind!,
    amount: value!,
    method: method!,
    status: "awaiting",
    recorded_by: user.id,
    note: method === "cash" ? "To be paid at the office" : `Payment details emailed (${method})`,
  });
  if (error) done(id, { error: error.message });

  if (method !== "cash") {
    const render = (accountUrl: string) =>
      paymentDetailsEmail({
        name: req!.customers?.name ?? null,
        reference: req!.reference,
        kind: kind!,
        amount: formatInr(value!),
        variant: method as "bank" | "upi" | "card_link",
        instructions,
        cardLink: method === "card_link" ? cardLink : null,
        quoteUrl: accountUrl,
      });
    after(() => notifyCustomerById(req!.customer_id, id, `payment_details_${method}`, quotePath(req!.reference), render));
  }
  done(id, { notice: method === "cash" ? "Cash payment expected; recorded as awaiting." : "Payment details sent to the customer." });
}

export async function markPaymentReceived(fd: FormData) {
  const id = str(fd, "id");
  const paymentId = str(fd, "payment_id");
  const { supabase, user } = await requireStaff(`/desk/requests/${id}`);
  const note = str(fd, "note");
  const { data: payment, error } = await supabase
    .from("payments")
    .update({ status: "received", received_at: new Date().toISOString(), recorded_by: user.id, ...(note ? { note } : {}) })
    .eq("id", paymentId)
    .eq("status", "awaiting")
    .select("kind, amount")
    .single();
  if (error || !payment) done(id, { error: error?.message ?? "That payment is already marked received." });

  const { data: req } = await supabase.from("quote_requests").select("reference, customer_id, customers(name)").eq("id", id).single();
  if (req) {
    const render = (accountUrl: string) =>
      paymentReceivedEmail({
        name: req.customers?.name ?? null,
        reference: req.reference,
        kind: payment!.kind,
        amount: formatInr(Number(payment!.amount)),
        quoteUrl: accountUrl,
      });
    after(() => notifyCustomerById(req.customer_id, id, `${payment!.kind}_received`, quotePath(req.reference), render));
  }
  done(id, { notice: `${payment!.kind === "advance" ? "Advance" : "Balance"} marked received; the customer has been told.` });
}

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

export async function uploadDocument(fd: FormData) {
  const id = str(fd, "id");
  const { supabase, user } = await requireStaff(`/desk/requests/${id}`);
  const type = oneOf<DocumentType>(str(fd, "type"), DOCUMENT_TYPES);
  const file = fd.get("file");
  if (!type || !(file instanceof File) || file.size === 0) done(id, { error: "Choose a document type and a file." });
  const f = file as File;
  if (f.size > 10 * 1024 * 1024) done(id, { error: "Files can be up to 10 MB." });
  if (!ALLOWED_MIME.includes(f.type)) done(id, { error: "Upload a PDF or an image (JPG, PNG, WebP, HEIC)." });

  const safeName = f.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80) || "document";
  const path = `${id}/${crypto.randomUUID()}-${safeName}`;
  const { error: upErr } = await supabase.storage.from("documents").upload(path, f, { contentType: f.type });
  if (upErr) done(id, { error: `Upload failed: ${upErr.message}` });
  const { error } = await supabase.from("documents").insert({
    request_id: id,
    type: type!,
    storage_path: path,
    file_name: f.name.slice(0, 200),
    content_type: f.type,
    size_bytes: f.size,
    uploaded_by: user.id,
  });
  if (error) done(id, { error: error.message });
  done(id, { notice: "Document uploaded. It is visible in the customer's account." });
}

export async function notifyDocuments(fd: FormData) {
  const id = str(fd, "id");
  const { supabase } = await requireStaff(`/desk/requests/${id}`);
  const [{ data: req }, { data: docs }] = await Promise.all([
    supabase.from("quote_requests").select("reference, customer_id, customers(name)").eq("id", id).single(),
    supabase.from("documents").select("type, file_name").eq("request_id", id).neq("type", "ota_screenshot"),
  ]);
  if (!req || !docs || docs.length === 0) done(id, { error: "Upload at least one travel document first." });
  const render = (accountUrl: string) =>
      documentsReadyEmail({
      name: req!.customers?.name ?? null,
      reference: req!.reference,
      documents: docs!.map((d) => ({ type: d.type, fileName: d.file_name })),
      quoteUrl: accountUrl,
    });
  after(() => notifyCustomerById(req!.customer_id, id, "documents_ready", quotePath(req!.reference), render));
  done(id, { notice: "Customer emailed that their documents are ready." });
}

/** A free-text message to the customer: kept on the request and emailed. */
export async function sendMessage(fd: FormData) {
  const id = str(fd, "id");
  const message = String(fd.get("message") ?? "").trim();
  const { supabase, user, staff } = await requireStaff(`/desk/requests/${id}`);
  if (message.length === 0) done(id, { error: "Write a message before sending." });
  if (message.length > 4000) done(id, { error: "Keep the message under 4,000 characters, or split it in two." });

  const { data: req } = await supabase.from("quote_requests").select("reference, customer_id, customers(name, email)").eq("id", id).single();
  if (!req) done(id, { error: "This request no longer exists." });

  const { error } = await supabase.from("request_messages").insert({ request_id: id, sent_by: user.id, body: message });
  if (error) done(id, { error: `The message was not sent: ${error.message}` });

  const render = (accountUrl: string) =>
      deskMessageEmail({
      name: req!.customers?.name ?? null,
      reference: req!.reference,
      from: staff!.name,
      message,
      quoteUrl: accountUrl,
    });
  after(() => notifyCustomerById(req!.customer_id, id, "desk_message", quotePath(req!.reference), render));
  done(id, { notice: `Message sent to ${req!.customers?.email ?? "the customer"}. It is also in their account.` });
}
