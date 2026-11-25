"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";

// First-time tips. Each one shows until the person presses "Got it", which
// is remembered on that device; "Show all tips again" in Settings brings
// them back. Nothing is stored on the server.

const PREFIX = "udan-tip:";

export function Tip({ id, title = "Tip", children }: { id: string; title?: string; children: React.ReactNode }) {
  // Hidden until the browser says whether this tip was dismissed, so a tip
  // someone already closed never flashes up again.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    try {
      setShown(localStorage.getItem(PREFIX + id) !== "hidden");
    } catch {
      setShown(true);
    }
  }, [id]);

  if (!shown) return null;
  const hide = () => {
    try {
      localStorage.setItem(PREFIX + id, "hidden");
    } catch {
      // Private browsing: the tip just hides for this visit.
    }
    setShown(false);
  };

  return (
    <aside aria-label={title} className="flex items-start gap-3 rounded-xl border-l-4 border-udan-blue bg-blue-50/70 px-4 py-3 text-base leading-relaxed text-blue-950">
      <Lightbulb aria-hidden className="mt-1 size-5 shrink-0 text-udan-blue" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold">{title}</p>
        {children}
      </div>
      <button
        type="button"
        onClick={hide}
        aria-label={`Hide the tip: ${title}`}
        className="-mr-1 shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-blue-900 underline underline-offset-4 hover:bg-blue-100"
      >
        Hide tip
      </button>
    </aside>
  );
}

export function ShowTipsAgain() {
  const [done, setDone] = useState(false);
  const reset = () => {
    try {
      for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key);
    } catch {
      // Nothing stored, so nothing to bring back.
    }
    setDone(true);
  };
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={reset}
        className="rounded-md border-2 border-udan-charcoal/30 bg-white px-4 py-2 font-semibold text-udan-charcoal hover:bg-udan-lightGray"
      >
        Show all tips again
      </button>
      <p role="status" className="text-sm text-udan-gray">
        {done ? "Done: the tips will show again on each page." : "Tips explain each step. Hidden tips come back on this device."}
      </p>
    </div>
  );
}
