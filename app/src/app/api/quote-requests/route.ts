import { describeIssues, quoteRequestSchema, toIntakePayload } from "@udan/core";
import { type NextRequest, NextResponse, after } from "next/server";
import { formDataToRequestInput } from "@/components/request-form/parse";
import { publicEnv, serverEnv } from "@/lib/env";
import { resolveDestinationSlug, sendIntakeNotifications } from "@/lib/intake";
import { createServiceClient } from "@/lib/supabase/server";

// Public intake for the website's Get a quote form (static HTML on
// udantravelsbdq.com). Works as a plain form post with no JavaScript (303
// redirect to a confirmation page) and as fetch() with Accept: application/json.

const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 5;
const SCREENSHOT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !serverEnv.allowedFormOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    Vary: "Origin",
  };
}

function errorPage(title: string, items: string[], status: number) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Udan Tours and Travels</title>
<style>body{font-family:Inter,Arial,sans-serif;max-width:560px;margin:48px auto;padding:0 16px;color:#2D2D2D;line-height:1.55}a{color:#FF8551}</style></head>
<body><h1>${esc(title)}</h1><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
<p><a href="javascript:history.back()">Go back to the form</a> (your answers are still there), or call us on <a href="tel:+919376214442">+91 93762 14442</a>.</p></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  const fail = (title: string, errors: string[], status: number) =>
    wantsJson ? NextResponse.json({ error: title, errors }, { status, headers: cors }) : errorPage(title, errors, status);

  if (origin && origin !== publicEnv.appUrl && !serverEnv.allowedFormOrigins.includes(origin)) {
    return fail("This form can only be sent from udantravelsbdq.com", [], 403);
  }

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return fail("We couldn't read that form", ["Please try again."], 400);
  }

  // Honeypot: real people never fill the hidden "company" field.
  if (String(fd.get("company") ?? "").trim() !== "") {
    return wantsJson
      ? NextResponse.json({ ok: true }, { headers: cors })
      : NextResponse.redirect(new URL("/quote/received", publicEnv.appUrl), 303);
  }

  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim().slice(0, 200);
  const phone = String(fd.get("phone") ?? "").trim().slice(0, 40);
  const issues: string[] = [];
  if (!EMAIL.test(email)) issues.push("email: Enter your email address; your quote is sent there and to your account.");
  const parsed = quoteRequestSchema.safeParse(formDataToRequestInput(fd));
  if (!parsed.success) issues.push(...describeIssues(parsed.error));

  const screenshot = fd.get("screenshot");
  const file = screenshot instanceof File && screenshot.size > 0 ? screenshot : null;
  if (file && (file.size > 10 * 1024 * 1024 || !SCREENSHOT_TYPES.includes(file.type))) {
    issues.push("screenshot: Attach a JPG, PNG, WebP, HEIC or PDF up to 10 MB.");
  }
  if (issues.length > 0 || !parsed.success) return fail("Please check a few details", issues, 422);

  const service = createServiceClient();

  const { data: existing } = await service.from("customers").select("id").eq("email", email).maybeSingle();
  if (existing) {
    const { count } = await service
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", existing.id)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= MAX_REQUESTS_PER_EMAIL_PER_HOUR) {
      return fail("We already have several requests from you", ["They are all with our desk. To add details, reply to our confirmation email or call us."], 429);
    }
  }

  const payload = toIntakePayload({
    ...parsed.data,
    destination_slug: parsed.data.destination_slug ?? (await resolveDestinationSlug(parsed.data.destination)),
  });
  const { data, error } = await service.rpc("intake_quote_request", {
    p_email: email,
    p_name: name,
    p_phone: phone,
    p_channel: "web",
    p_request: payload as never,
  });
  const created = data?.[0];
  if (error || !created) {
    console.error("intake failed", error);
    return fail("Your request could not be saved", [error?.message ?? "Please try again, or call us."], 500);
  }

  if (file) {
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80) || "screenshot";
    const path = `${created.request_id}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await service.storage.from("documents").upload(path, file, { contentType: file.type });
    if (!upErr) {
      await service.from("documents").insert({
        request_id: created.request_id,
        type: "ota_screenshot",
        storage_path: path,
        file_name: file.name.slice(0, 200),
        content_type: file.type,
        size_bytes: file.size,
      });
    }
  }

  after(async () => {
    // One email: its button signs the owner of this address in and opens the
    // request (invisible sign-in). The account is created on that first click.
    await sendIntakeNotifications({
      requestId: created.request_id,
      reference: created.reference,
      customerId: created.customer_id,
      channel: "web",
      confirmCustomer: true,
    });
  });

  const accountUrl = `${publicEnv.appUrl}/account/quotes/${created.reference}`;
  if (wantsJson) {
    return NextResponse.json({ ok: true, reference: created.reference, account_url: accountUrl }, { status: 201, headers: cors });
  }
  return NextResponse.redirect(new URL(`/quote/received?ref=${created.reference}`, publicEnv.appUrl), 303);
}
