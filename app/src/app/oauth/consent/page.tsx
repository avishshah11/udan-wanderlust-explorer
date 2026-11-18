import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { approve, deny } from "./actions";

export const metadata = { title: "Connect to Udan" };

// Supabase Auth (the OAuth 2.1 server for the Claude connector) sends people
// here to sign in and approve an app such as Claude.
export default async function Consent({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string; error?: string }>;
}) {
  const { authorization_id: id, error } = await searchParams;
  if (!id) {
    return (
      <p className="mx-auto max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
        This link is incomplete. Start connecting again from Claude.
      </p>
    );
  }
  const { supabase, user } = await requireUser(`/oauth/consent?authorization_id=${encodeURIComponent(id)}`);
  const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (detailsError || !data) {
    return (
      <p className="mx-auto max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
        This connection request has expired or was already used. Start connecting again from Claude.
      </p>
    );
  }
  // Already approved before: straight back to the app.
  if ("redirect_url" in data) redirect(data.redirect_url);

  const appName = data.client.name || "An app";
  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-7 shadow-sm">
      <h1 className="text-xl font-bold text-udan-charcoal">Connect {appName} to your Udan account</h1>
      <p className="mt-2 text-sm text-udan-gray">Signed in as {user.email}</p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">
          That didn&apos;t go through. Please try again.
        </p>
      )}
      <p className="mt-5 text-sm">If you allow it, {appName} can, when you ask it to:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-udan-charcoal">
        <li>send trips to our pricing desk as quote requests</li>
        <li>read your Udan quotes, their status and prices</li>
        <li>accept a quote you choose (no payment is ever taken through it)</li>
      </ul>
      <p className="mt-4 text-xs text-udan-gray">
        It cannot see other customers&apos; quotes or our supplier rates. You can disconnect it at any time in its settings.
      </p>
      <div className="mt-6 flex gap-3">
        <form action={approve}>
          <input type="hidden" name="authorization_id" value={id} />
          <SubmitButton pendingText="Connecting…">Allow</SubmitButton>
        </form>
        <form action={deny}>
          <input type="hidden" name="authorization_id" value={id} />
          <SubmitButton variant="outline" pendingText="Cancelling…">Cancel</SubmitButton>
        </form>
      </div>
    </div>
  );
}
