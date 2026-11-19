import type { FxRate } from "@udan/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@udan/core";

export async function loadRates(supabase: SupabaseClient<Database>): Promise<FxRate[]> {
  const { data } = await supabase.from("fx_latest").select("currency, inr_per_unit, rate_date");
  return (data ?? []).flatMap((r) =>
    r.currency && r.inr_per_unit && r.rate_date
      ? [{ currency: r.currency, inrPerUnit: Number(r.inr_per_unit), rateDate: r.rate_date }]
      : [],
  );
}
