import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Where a trip is, as numbered steps: ticks for what is done, the current
 * step highlighted, the rest greyed. A row on wide screens, a list on phones.
 * `current` is the step in progress; steps.length means everything is done.
 */
export function ProgressSteps({ steps, current, label }: { steps: readonly string[]; current: number; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col gap-3 sm:flex-row sm:gap-0">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center",
              // The line joining each step to the one before it (wide screens).
              i > 0 &&
                "sm:before:absolute sm:before:left-[-50%] sm:before:right-[50%] sm:before:top-5 sm:before:h-1 sm:before:-translate-y-1/2 sm:before:rounded-full",
              i > 0 && (state === "todo" ? "sm:before:bg-zinc-200" : "sm:before:bg-emerald-600"),
            )}
          >
            <span
              className={cn(
                "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold",
                state === "done" && "border-emerald-600 bg-emerald-600 text-white",
                state === "current" && "border-primary bg-white text-primary ring-4 ring-primary/15",
                state === "todo" && "border-zinc-300 bg-white text-zinc-500",
              )}
            >
              {state === "done" ? <Check aria-hidden className="size-5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "text-base leading-snug",
                state === "current" ? "font-bold text-udan-charcoal" : state === "done" ? "font-medium text-udan-charcoal" : "text-zinc-500",
              )}
            >
              {step}
              {state === "done" && <span className="sr-only"> (done)</span>}
              {state === "current" && <span className="sr-only"> (in progress)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
