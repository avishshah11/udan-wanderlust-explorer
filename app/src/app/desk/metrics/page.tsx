import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Desk metrics" };

interface Metrics {
  since: string;
  requests: number;
  quotes_sent: number;
  quotes_accepted: number;
  accept_rate: number | null;
  median_hours_to_quote: number | null;
  median_hours_to_payment: number | null;
  open_queue: number;
  awaiting_payment: number;
}

const WINDOWS = { "30": "Last 30 days", "90": "Last 90 days", "365": "Last 12 months" } as const;

function hours(h: number | null) {
  if (h == null) return "–";
  if (h < 48) return `${h} h`;
  return `${Math.round((h / 24) * 10) / 10} days`;
}

export default async function DeskMetrics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = daysParam && daysParam in WINDOWS ? (daysParam as keyof typeof WINDOWS) : "90";
  const supabase = await createClient();
  const since = new Date(Date.now() - Number(days) * 86400000).toISOString();
  const { data, error } = await supabase.rpc("desk_metrics", { p_since: since });
  if (error) throw error;
  const m = data as unknown as Metrics;

  const cards: [string, string, string][] = [
    ["Median time to quote", hours(m.median_hours_to_quote), "Request received to first quote sent. PRD target: 1 business day simple, 3 complex."],
    ["Median time to payment", hours(m.median_hours_to_payment), "Accepted to first payment received."],
    ["Quote to accept", m.accept_rate == null ? "–" : `${Math.round(m.accept_rate * 1000) / 10}%`, `${m.quotes_accepted} of ${m.quotes_sent} quotes sent. Target 15%+.`],
    ["Requests", String(m.requests), "Received in this window."],
    ["In the queue now", String(m.open_queue), "Queued or being priced."],
    ["Awaiting payment now", String(m.awaiting_payment), "Accepted; send or chase payment details."],
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {Object.entries(WINDOWS).map(([k, label]) => (
          <a key={k} href={`/desk/metrics?days=${k}`} className={`rounded-full px-3 py-1 ${k === days ? "bg-udan-charcoal text-white" : "bg-white"}`}>
            {label}
          </a>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([title, value, note]) => (
          <div key={title} className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-udan-gray">{title}</p>
            <p className="mt-1 text-3xl font-bold text-udan-charcoal">{value}</p>
            <p className="mt-2 text-xs text-udan-gray">{note}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-udan-gray">Internal only. Turnaround is measured here and never shown to customers.</p>
    </section>
  );
}
