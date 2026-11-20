-- 1. The destination catalogue, so a fresh hosted project has the places the
--    website and the rate card refer to. Until now it lived only in the dev
--    seed. Slugs match web/src/content/destinations/*.md. destination_group
--    is only the key markup rules use; change it on the desk if the owner
--    groups destinations differently.
--
-- 2. A daily exchange-rate feed for display conversions: European Central
--    Bank reference rates, served without a key by frankfurter.dev, fetched
--    by pg_cron at 16:30 UTC (after the ECB publishes). AED is derived from
--    USD at the 3.6725 peg. Every converted amount stays labelled "approx.".

insert into public.destinations (slug, name, country, destination_group, is_domestic, best_months, typical_inclusions, published) values
  ('kerala',    'Kerala',    'India',     'domestic',        true,  '{10,11,12,1,2,3}', '{"Hotel or houseboat stays","Private car with driver","Breakfast"}', true),
  ('rajasthan', 'Rajasthan', 'India',     'domestic',        true,  '{10,11,12,1,2,3}', '{"Heritage hotels","Private car with driver","Breakfast"}', true),
  ('goa',       'Goa',       'India',     'domestic',        true,  '{11,12,1,2}',      '{"Beach resort","Airport transfers","Breakfast"}', true),
  ('ladakh',    'Ladakh',    'India',     'domestic',        true,  '{5,6,7,8,9}',      '{"Hotels and camps, with breakfast and dinner","Private vehicle with a mountain driver","Inner Line permits","Airport transfers in Leh"}', true),
  ('bali',      'Bali',      'Indonesia', 'south-east-asia', false, '{4,5,6,7,8,9}',    '{"Hotel or villa","Airport transfers","Sightseeing tours","Breakfast"}', true),
  ('dubai',     'Dubai',     'UAE',       'middle-east',     false, '{11,12,1,2,3}',    '{"Hotel","Airport transfers","Desert safari","City tour"}', true),
  ('maldives',  'Maldives',  'Maldives',  'indian-ocean',    false, '{11,12,1,2,3,4}',  '{"Resort stay in the villa category you choose","Meal plan","Speedboat or seaplane transfers from Malé"}', true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Exchange rates
-- ---------------------------------------------------------------------------

create extension if not exists http with schema extensions;

-- Stores one day of rates from a frankfurter.dev response with base EUR:
-- {"base":"EUR","date":"2026-11-19","rates":{"GBP":0.83581,"INR":102.55,"USD":1.0992}}
create function private.store_fx_rates(p_body jsonb) returns date
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_date date := (p_body ->> 'date')::date;
  v_inr numeric := (p_body -> 'rates' ->> 'INR')::numeric;
  v_usd numeric := (p_body -> 'rates' ->> 'USD')::numeric;
  v_gbp numeric := (p_body -> 'rates' ->> 'GBP')::numeric;
  v_src text := 'ECB reference rate via frankfurter.dev (approximate)';
begin
  if p_body ->> 'base' is distinct from 'EUR' or v_date is null
     or coalesce(v_inr, 0) <= 0 or coalesce(v_usd, 0) <= 0 or coalesce(v_gbp, 0) <= 0 then
    raise exception 'Unexpected exchange-rate response: %', left(p_body::text, 300)
      using errcode = 'invalid_parameter_value';
  end if;

  insert into public.fx_rates (currency, rate_date, inr_per_unit, source) values
    ('EUR', v_date, round(v_inr, 4), v_src),
    ('USD', v_date, round(v_inr / v_usd, 4), v_src),
    ('GBP', v_date, round(v_inr / v_gbp, 4), v_src),
    ('AED', v_date, round(v_inr / v_usd / 3.6725, 4), 'ECB USD rate / 3.6725 AED peg (approximate)')
  on conflict (currency, rate_date) do update
     set inr_per_unit = excluded.inr_per_unit, source = excluded.source;
  return v_date;
end $$;

create function private.fetch_fx_rates() returns date
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_res extensions.http_response;
begin
  v_res := extensions.http_get('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=INR,USD,GBP');
  if v_res.status <> 200 then
    raise exception 'Exchange-rate feed answered HTTP %', v_res.status;
  end if;
  return private.store_fx_rates(v_res.content::jsonb);
end $$;

revoke execute on function private.store_fx_rates(jsonb) from public, anon, authenticated;
revoke execute on function private.fetch_fx_rates() from public, anon, authenticated;

select cron.schedule('udan-fetch-fx-rates', '30 16 * * *', $$select private.fetch_fx_rates()$$);
