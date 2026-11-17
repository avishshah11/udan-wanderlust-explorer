import { RequestForm } from "@/components/request-form/request-form";
import { requireUser } from "@/lib/auth";
import { submitCustomerRequest } from "./actions";

export const metadata = { title: "Get a quote" };

export default async function NewRequest() {
  const { supabase, user } = await requireUser("/account/new");
  const [{ data: destinations }, { data: customer }] = await Promise.all([
    supabase.from("destinations").select("name").order("name"),
    supabase.from("customers").select("display_currency").eq("user_id", user.id).maybeSingle(),
  ]);
  return (
    <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-udan-charcoal">Get a quote</h1>
      <p className="mb-6 mt-1 text-sm text-udan-gray">
        Tell us what you have in mind. A member of our family prices every trip against our supplier rates, and your quote will appear in your account and your inbox.
      </p>
      <RequestForm
        action={submitCustomerRequest}
        mode="customer"
        destinations={(destinations ?? []).map((d) => d.name)}
        defaultCurrency={customer?.display_currency ?? "INR"}
      />
    </div>
  );
}
