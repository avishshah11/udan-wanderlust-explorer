"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Posts the link token once, by itself; the button is there without JavaScript. */
export function ContinueForm({ token }: { token: string }) {
  const form = useRef<HTMLFormElement>(null);
  const posted = useRef(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (posted.current || !form.current) return;
    posted.current = true;
    setOpening(true);
    form.current.requestSubmit();
  }, []);

  return (
    <form
      ref={form}
      method="post"
      action="/auth/link/continue"
      className="space-y-4"
      onSubmit={() => {
        posted.current = true;
        setOpening(true);
      }}
    >
      <input type="hidden" name="t" value={token} />
      <p role="status" className="text-sm text-muted-foreground">
        {opening ? "Signing you in and opening your page…" : "Press Continue to open your page."}
      </p>
      <Button type="submit" className="w-full" disabled={opening}>
        {opening ? "Opening…" : "Continue"}
      </Button>
    </form>
  );
}
