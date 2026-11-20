import { type Database, type FxRate, RATE_CARD_COLUMNS, bandBasis, bandFromRow, nightsGroup, partyRange, pickBand } from "@udan/core";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import type { Env } from "./env";
import type { CustomerQuoteData, DestinationInfo, PublicData, UserData } from "./tools";

type Client = SupabaseClient<Database>;

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } } as const;

export function anonClient(env: Env): Client {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, options);
}

/** Acts as the signed-in user: row level security and the customer functions apply. */
export function userClient(env: Env, accessToken: string): Client {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    ...options,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export function publicData(env: Env): PublicData {
  const db = anonClient(env);
  let destinations: Promise<DestinationInfo[]> | null = null;
  const loadDestinations = () =>
    (destinations ??= (async () => {
      const { data } = await db.from("destinations").select("slug, name, best_months, typical_inclusions");
      return (data ?? []).map((d) => ({ slug: d.slug, name: d.name, bestMonths: d.best_months, typicalInclusions: d.typical_inclusions }));
    })());

  return {
    async findDestination(name) {
      const key = name.trim().toLowerCase();
      const all = await loadDestinations();
      return all.find((d) => d.name.toLowerCase() === key || d.slug === key) ?? all.find((d) => key.includes(d.name.toLowerCase())) ?? null;
    },
    async rates(): Promise<FxRate[]> {
      const { data } = await db.from("fx_latest").select("currency, inr_per_unit, rate_date");
      return (data ?? []).flatMap((r) =>
        r.currency && r.inr_per_unit && r.rate_date ? [{ currency: r.currency, inrPerUnit: Number(r.inr_per_unit), rateDate: r.rate_date }] : [],
      );
    },
    async band(input) {
      if (!input.destinationSlug) return null;
      // Row level security returns only public bands (5+ samples).
      const { data, error } = await db
        .from("rate_card")
        .select(RATE_CARD_COLUMNS)
        .eq("destination_slug", input.destinationSlug)
        .eq("nights_group", nightsGroup(input.nights));
      if (error) throw new Error(error.message);
      const band = pickBand((data ?? []).map(bandFromRow), {
        destinationSlug: input.destinationSlug,
        nights: input.nights,
        month: input.month,
        tier: input.tier,
      });
      if (!band) return null;
      return { ...partyRange(band, input.adults), sampleCount: band.sampleCount, basis: bandBasis(band, input.adults, input.children) };
    },
  };
}

export function userData(env: Env, accessToken: string): UserData {
  const db = userClient(env, accessToken);
  return {
    async submitRequest(payload) {
      const { data, error } = await db.rpc("submit_quote_request", { p_channel: "claude", p_request: payload as never });
      if (error || !data?.[0]) return { error: error?.message ?? "no reference returned" };
      return { reference: data[0].reference };
    },
    async quote(reference) {
      const { data, error } = await db.rpc("quote_for_customer", { p_reference: reference });
      if (error) throw new Error(error.message);
      return (data as unknown as CustomerQuoteData | null) ?? null;
    },
    async accept(reference) {
      const { data, error } = await db.rpc("accept_quote", { p_reference: reference });
      if (error) throw new Error(error.message);
      return data as unknown as { result: string; status?: string; total_inr?: number };
    },
  };
}
