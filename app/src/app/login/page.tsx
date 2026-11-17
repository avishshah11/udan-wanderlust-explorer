import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Enter your email and we will send a new one.",
  google: "Google sign-in did not complete. Please try again, or use the email link instead.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign in to Udan</CardTitle>
          <CardDescription>
            Your quotes, bookings and travel documents in one place. No password: we email you a link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {params.error && ERRORS[params.error] && (
            <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              {ERRORS[params.error]}
            </p>
          )}
          <LoginForm next={next} defaultEmail={params.email} />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="outline" className="w-full">
              Continue with Google
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            By signing in you agree to our{" "}
            <a className="underline" href="https://udantravelsbdq.com/terms">
              terms
            </a>{" "}
            and{" "}
            <a className="underline" href="https://udantravelsbdq.com/privacy">
              privacy policy
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
