import type { RequestStatus } from "@udan/core";
import { cn } from "@/lib/utils";

const LABELS: Record<RequestStatus, string> = {
  queued: "Queued",
  pricing: "Pricing",
  sent: "Sent",
  awaiting_payment: "Awaiting payment",
  advance_received: "Advance received",
  balance_received: "Paid in full",
  cancelled: "Cancelled",
};

const TONE: Record<RequestStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  pricing: "bg-amber-100 text-amber-800",
  sent: "bg-blue-100 text-blue-800",
  awaiting_payment: "bg-orange-100 text-orange-800",
  advance_received: "bg-emerald-100 text-emerald-800",
  balance_received: "bg-emerald-200 text-emerald-900",
  cancelled: "bg-zinc-200 text-zinc-600",
};

/** Staff-facing status, including the "re-check" state for expired quotes the customer wants. */
export function DeskStatus({
  status,
  acceptRequestedAt,
  acceptedAt,
}: {
  status: RequestStatus;
  acceptRequestedAt: string | null;
  acceptedAt: string | null;
}) {
  const recheck = status === "pricing" && acceptRequestedAt && !acceptedAt;
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", recheck ? "bg-red-100 text-red-800" : TONE[status])}>
      {recheck ? "Re-check: customer wants to accept" : LABELS[status]}
    </span>
  );
}
