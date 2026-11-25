import { RequestForm } from "@/components/request-form/request-form";
import { createClient } from "@/lib/supabase/server";
import { createStaffRequest } from "./actions";
import { Tip } from "@/components/tip";

export const metadata = { title: "New request" };

export default async function NewDeskRequest() {
  const supabase = await createClient();
  const { data } = await supabase.from("destinations").select("name").order("name");
  return (
    <div className="space-y-5">
      <Tip id="desk-new" title="When to use this">
        <p>
          When a customer phones, sends a WhatsApp or walks in, enter their email and the trip here. It joins the queue like any other request, and the
          customer can follow it in their account.
        </p>
      </Tip>
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">New request from a phone call, WhatsApp or email</h2>
        <p className="mb-5 text-sm text-udan-gray">
          This creates the customer&apos;s account from their email if they don&apos;t have one. The quote will land in that account and their inbox.
        </p>
        <RequestForm action={createStaffRequest} mode="staff" destinations={(data ?? []).map((d) => d.name)} />
      </section>
    </div>
  );
}
