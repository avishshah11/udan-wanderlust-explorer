import { type RequestStatus, customerStatus } from "@udan/core";
import { cn } from "@/lib/utils";

const tone: Record<RequestStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  pricing: "bg-amber-100 text-amber-800",
  sent: "bg-blue-100 text-blue-800",
  awaiting_payment: "bg-orange-100 text-orange-800",
  advance_received: "bg-emerald-100 text-emerald-800",
  balance_received: "bg-emerald-200 text-emerald-900",
  cancelled: "bg-zinc-200 text-zinc-600",
};

export function StatusBadge(props: {
  status: RequestStatus;
  acceptRequestedAt?: string | null;
  acceptedAt?: string | null;
  className?: string;
}) {
  const { label } = customerStatus(props);
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tone[props.status], props.className)}>
      {label}
    </span>
  );
}
