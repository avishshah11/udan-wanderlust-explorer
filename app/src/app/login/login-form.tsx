"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { type LoginState, sendMagicLink } from "./actions";

export function LoginForm({ next, defaultEmail }: { next: string; defaultEmail?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(sendMagicLink, {});

  if (state.sentTo) {
    return (
      <div role="status" className="rounded-lg bg-emerald-50 p-4 text-base text-emerald-900">
        <p className="text-lg font-semibold">Check your inbox</p>
        <p className="mt-1">
          We have sent a sign-in link to <strong>{state.sentTo}</strong>. Open it on this device or any other to see
          your quotes. If it isn&apos;t there, look in your spam folder.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={defaultEmail} />
      </div>
      {state.error && (
        <p role="alert" className="text-base font-medium text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg" className="w-full" pendingText="Sending…">
        Email me a sign-in link
      </SubmitButton>
    </form>
  );
}
