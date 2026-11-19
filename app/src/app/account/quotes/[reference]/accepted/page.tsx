import { formatInr } from "@udan/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import type { CustomerQuote } from "@/lib/customer-quote";

export const metadata = { title: "Quote accepted" };

export default async function Accepted({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const { supabase } = await requireUser(`/account/quotes/${reference}/accepted`);
  const { data } = await supabase.rpc("quote_for_customer", { p_reference: reference });
  const q = data as unknown as CustomerQuote | null;
  if (!q || !q.accepted_at) notFound();

  return (
    <div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden>✓</div>
      <h1 className="mt-4 text-2xl font-bold text-udan-charcoal">Thank you, you have accepted this quote</h1>
      <p className="mt-2 text-udan-gray">
        Quote <span className="font-mono">{q.reference}</span> for {formatInr(Number(q.total_inr))} is accepted. The price and inclusions are now fixed.
      </p>
      <div className="mt-6 rounded-lg bg-orange-50 p-4 text-left text-sm text-orange-900">
        <p className="font-semibold">Status: Accepted, awaiting payment</p>
        <p className="mt-1">
          Payment details are on their way to your email from our team: bank transfer or UPI, or a card payment link if you are paying from outside India.
          When your advance reaches us, your account will show it as received and we will start your bookings.
        </p>
      </div>
      <p className="mt-6 text-sm text-udan-gray">
        Questions? Call <a className="underline" href="tel:+919376214442">+91 93762 14442</a> or reply to any of our emails.
      </p>
      <Button asChild className="mt-6">
        <Link href={`/account/quotes/${q.reference}`}>View your booking</Link>
      </Button>
    </div>
  );
}
