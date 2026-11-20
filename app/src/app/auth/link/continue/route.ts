import { type NextRequest, NextResponse } from "next/server";
import { LOGIN_EMAIL_COOKIE, safeNext } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Uses a one-time sign-in link from a customer email and signs the customer in
// (supabase/migrations/20261120000400_sign_in_links.sql). Supabase Auth makes
// the session: a magic link generated here and verified at once, so it never
// leaves the server.

type LinkResult = {
  status: "ok" | "used" | "expired" | "refused" | "unknown";
  email?: string;
  next?: string;
};

function goTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin), 303);
}

/** The usual sign-in page, with the address filled in from a short-lived cookie (not the URL). */
function signIn(request: NextRequest, next: string, email?: string) {
  const response = goTo(request, `/login?error=link&next=${encodeURIComponent(next)}`);
  if (email) {
    response.cookies.set(LOGIN_EMAIL_COOKIE, email, {
      path: "/login",
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export async function POST(request: NextRequest) {
  // Only the landing page posts here, so no other site can sign a visitor in
  // to an account of its choosing.
  const origin = request.headers.get("origin");
  if (origin !== request.nextUrl.origin && origin !== publicEnv.appUrl) return goTo(request, "/login");

  const form = await request.formData().catch(() => null);
  const token = String(form?.get("t") ?? "");

  const service = createServiceClient();
  const { data, error } = await service.rpc("use_sign_in_link", { p_token: token });
  const link: LinkResult = error || !data ? { status: "unknown" } : (data as LinkResult);
  const next = safeNext(link.next);
  const supabase = await createClient();

  if (link.status === "ok" && link.email) {
    const generated = await service.auth.admin.generateLink({ type: "magiclink", email: link.email });
    if (!generated.error) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: generated.data.properties.hashed_token,
      });
      if (!verifyError) return goTo(request, next);
    }
    return signIn(request, next, link.email);
  }

  // Used, expired, refused or unknown: someone already signed in on this
  // device goes straight on (the page shows only their own data).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return goTo(request, next);
  return signIn(request, next, link.status === "used" || link.status === "expired" ? link.email : undefined);
}
