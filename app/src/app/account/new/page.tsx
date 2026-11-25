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
    <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-udan-charcoal">Get a quote</h1>
      <p className="mb-6 mt-1 text-sm text-udan-gray">
        Tell us what you have in mind. A member of our family prices every trip against our supplier rates, and your quote will appear in your account and your inbox.
      </p>
      <div className="mb-6">
        <Tip id="new-request" title="Filling in this form">
          <p>Fill in what you know. If you are not sure of exact dates, choose the month. Anything you cannot fit in a box can go in &ldquo;Anything else we should know&rdquo; at the end.</p>
          <p>Nothing is booked or paid when you send this. You can change anything later by replying to our email.</p>
        </Tip>
      </div>
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
