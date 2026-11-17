import { type FxRate, displayPrice } from "@udan/core";

/** INR first, the customer's currency alongside, always marked approximate. */
export function Money({
  inr,
  currency,
  rates,
  showNote = false,
  className,
}: {
  inr: number;
  currency: string;
  rates: FxRate[];
  showNote?: boolean;
  className?: string;
}) {
  const p = displayPrice(inr, currency, rates);
  return (
    <span className={className}>
      <span className="font-semibold">{p.inr}</span>
      {p.approxLabel && <span className="ml-1.5 text-sm text-muted-foreground">({p.approxLabel})</span>}
      {showNote && p.rateNote && <span className="mt-1 block text-xs text-muted-foreground">{p.rateNote}</span>}
    </span>
  );
}
