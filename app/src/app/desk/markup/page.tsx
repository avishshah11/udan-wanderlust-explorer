import { LINE_TYPES, LINE_TYPE_LABELS } from "@udan/core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { saveRule } from "./actions";

export const metadata = { title: "Markup rules" };
const select = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm";

export default async function MarkupRules({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: rules }, { data: destinations }] = await Promise.all([
    supabase.from("markup_rules").select("*").order("destination_group", { nullsFirst: true }).order("product_type", { nullsFirst: true }),
    supabase.from("destinations").select("destination_group"),
  ]);
  const groups = [...new Set((destinations ?? []).map((d) => d.destination_group))].sort();

  return (
    <section className="space-y-5 rounded-xl bg-white p-5 shadow-sm">
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      <div>
        <h2 className="text-lg font-semibold">Markup rules</h2>
        <p className="text-sm text-udan-gray">
          Sell price = net cost × (1 + markup %). The most specific active rule wins: group and product type, then group, then product type, then the catch-all.
          Pricers can override a line on a single quote; every override and every change here is logged.
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b text-xs uppercase text-udan-gray">
          <tr><th className="py-2">Destination group</th><th>Product type</th><th>Markup %</th><th>Active</th><th>Updated</th><th /></tr>
        </thead>
        <tbody>
          {(rules ?? []).map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.destination_group ?? <em className="text-udan-gray">any</em>}</td>
              <td>{r.product_type ? LINE_TYPE_LABELS[r.product_type] : <em className="text-udan-gray">any</em>}</td>
              <td colSpan={2}>
                <form action={saveRule} className="flex items-center gap-3">
                  <input type="hidden" name="rule_id" value={r.id} />
                  <Input name="markup_pct" defaultValue={Number(r.markup_pct)} className="h-9 w-24" aria-label="Markup %" />
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={r.active} /> active</label>
                  <SubmitButton size="sm" variant="outline">Save</SubmitButton>
                </form>
              </td>
              <td className="text-xs text-udan-gray">{formatDateTime(r.updated_at)}{r.note ? ` · ${r.note}` : ""}</td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>
      <form action={saveRule} className="grid gap-3 rounded-lg bg-udan-lightGray p-4 md:grid-cols-5 md:items-end">
        <div className="space-y-1">
          <Label htmlFor="destination_group">Destination group</Label>
          <Input id="destination_group" name="destination_group" list="groups" placeholder="blank = any" />
          <datalist id="groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
        </div>
        <div className="space-y-1">
          <Label htmlFor="product_type">Product type</Label>
          <select id="product_type" name="product_type" className={select} defaultValue="">
            <option value="">Any</option>
            {LINE_TYPES.map((t) => <option key={t} value={t}>{LINE_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="markup_pct">Markup %</Label>
          <Input id="markup_pct" name="markup_pct" inputMode="decimal" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="note">Note</Label>
          <Input id="note" name="note" />
        </div>
        <input type="hidden" name="active" value="on" />
        <SubmitButton>Add rule</SubmitButton>
      </form>
    </section>
  );
}
