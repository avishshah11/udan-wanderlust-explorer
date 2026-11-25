import { REQUEST_TYPES, type RequestType } from "@udan/core";
import { RequestForm } from "@/components/request-form/request-form";
import { Tip } from "@/components/tip";
import { requireUser } from "@/lib/auth";
import { submitCustomerRequest } from "./actions";

export const metadata = { title: "Get a quote" };

export default async function NewRequest({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const defaultType = (REQUEST_TYPES as readonly string[]).includes(type ?? "") ? (type as RequestType) : "package";
  const { supabase, user } = await requireUser(`/account/new${defaultType === "package" ? "" : `?type=${defaultType}`}`);
  const [{ data: destinations }, { data: customer }] = await Promise.all([
    supabase.from("destinations").select("name").order("name"),
    supabase.from("customers").select("display_currency").eq("user_id", user.id).maybeSingle(),
  ]);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-udan-charcoal">Get a quote</h1>
        <p className="mt-2 text-lg text-udan-gray">
          Answer a few questions. A member of our family prices every trip against our supplier rates, and your quote will appear in your account and
          your inbox.
        </p>
      </div>
      <Tip id="new-request" title="Not sure about something?">
        <p>Fill in what you know and leave the rest. You can change anything later by replying to our email.</p>
      </Tip>
      <RequestForm
        action={submitCustomerRequest}
        mode="customer"
        destinations={(destinations ?? []).map((d) => d.name)}
        defaultCurrency={customer?.display_currency ?? "INR"}
        defaultType={defaultType}
      />
    </div>
  );
}
