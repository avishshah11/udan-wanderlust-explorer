import { normalizeReference } from "@udan/core";
import { publicEnv } from "@/lib/env";

export const metadata = { title: "Request received" };

export default async function Received({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const reference = ref ? normalizeReference(ref) : null;
  return (
    <div className="mx-auto max-w-xl rounded-xl bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden>✓</div>
      <h1 className="mt-4 text-2xl font-bold text-udan-charcoal">Thank you, we have your request</h1>
      {reference && (
        <p className="mt-3 text-lg">
          Your reference is <span className="font-mono font-semibold">{reference}</span>
        </p>
      )}
      <div className="mt-5 space-y-3 text-left text-sm text-udan-gray">
        <p>
          <strong className="text-udan-charcoal">Status: Request received.</strong> A member of our family will price your trip against our supplier rates.
        </p>
        <p>
          We have emailed you a confirmation and a sign-in link. Open the link to see your request in your Udan account; your quote will appear
          there and in your inbox.
        </p>
      </div>
      <p className="mt-6 text-sm">
        <a className="text-udan-orange underline" href={publicEnv.siteUrl}>Back to udantravelsbdq.com</a>
      </p>
    </div>
  );
}
