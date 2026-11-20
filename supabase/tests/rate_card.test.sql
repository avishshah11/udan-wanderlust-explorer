-- Rate card, the destination catalogue and the exchange-rate feed.
-- Run with: pnpm --filter @udan/supabase test:db  (local stack must be running)
begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- A destination of our own, so the numbers below do not depend on the seed.
insert into public.destinations (slug, name, country, destination_group, is_domestic, published)
values ('test-isle', 'Test Isle', 'Nowhere', 'test', false, true);

-- March, 4-star, 5 nights: per adult 10k, 12k, 14k, 16k, 18k (2 adults each).
insert into public.rate_samples (source, import_key, destination_slug, travel_month, hotel_tier, nights, adults, land_total_inr)
select 'import', 'test-mar-' || i, 'test-isle', 3, '4_star', 5, 2, (10000 + i * 2000) * 2
  from generate_series(0, 4) as i;
-- April, 4-star, 6 nights (same 5-6 group): four at 20k per adult.
insert into public.rate_samples (source, import_key, destination_slug, travel_month, hotel_tier, nights, adults, land_total_inr)
select 'import', 'test-apr-' || i, 'test-isle', 4, '4_star', 6, 3, 60000
  from generate_series(1, 4) as i;
-- Not banded: a family with a child, and one adult travelling alone.
insert into public.rate_samples (source, import_key, destination_slug, travel_month, hotel_tier, nights, adults, children, land_total_inr) values
  ('import', 'test-family', 'test-isle', 3, '4_star', 5, 2, 1, 900000),
  ('import', 'test-solo',   'test-isle', 3, '4_star', 5, 1, 0, 900000);

select private.refresh_rate_card();

-- ---------------------------------------------------------------- building bands
select is(
  array[public.nights_group(1), public.nights_group(2), public.nights_group(3), public.nights_group(4), public.nights_group(5),
        public.nights_group(6), public.nights_group(7), public.nights_group(9), public.nights_group(10), public.nights_group(90)]::text[],
  array['1-2','1-2','3-4','3-4','5-6','5-6','7-9','7-9','10+','10+'],
  'nights are grouped 1-2 / 3-4 / 5-6 / 7-9 / 10+'
);
select results_eq(
  $$ select price_low, price_high, sample_count from public.rate_card
      where destination_slug = 'test-isle' and month = 3 and hotel_tier = '4_star' and nights_group = '5-6' $$,
  $$ values (12000::numeric, 16000::numeric, 5) $$,
  'month band: middle half of per-adult prices, 5 samples'
);
select results_eq(
  $$ select sample_count from public.rate_card where destination_slug = 'test-isle' and month = 4 $$,
  $$ values (4) $$,
  'a month with 4 samples still gets a band (hidden from the public)'
);
select results_eq(
  $$ select price_low, price_high, sample_count from public.rate_card
      where destination_slug = 'test-isle' and month is null and hotel_tier = '4_star' and nights_group = '5-6' $$,
  $$ values (14000::numeric, 20000::numeric, 9) $$,
  'all-months band pools every month; families and solo travellers are left out'
);
select is((select count(*)::int from public.rate_card where destination_slug = 'test-isle'), 3, 'three bands for the test destination');

-- ---------------------------------------------------------------- anonymous
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok($$ select count(*) from public.rate_samples $$, '42501', null, 'anon: no access to rate samples');
select is((select count(*)::int from public.rate_card where destination_slug = 'test-isle'), 2, 'anon: sees only bands with 5+ samples');
select is((select count(*)::int from public.rate_card where sample_count < 5), 0, 'anon: no band under 5 samples anywhere');
select throws_ok(
  $$ insert into public.rate_card (destination_slug, hotel_tier, nights_group, price_low, price_high, sample_count) values ('test-isle', '3_star', '1-2', 1, 1, 9) $$,
  '42501', null, 'anon: cannot write bands'
);
select throws_ok($$ select public.refresh_rate_card() $$, '42501', null, 'anon: cannot rebuild bands');

-- ---------------------------------------------------------------- customer: asha
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-4333-8333-333333333333","email":"asha@example.com","role":"authenticated"}';

select is((select count(*)::int from public.rate_samples), 0, 'customer: sees no rate samples');
select is((select count(*)::int from public.rate_card where destination_slug = 'test-isle'), 2, 'customer: sees public bands only');
select throws_ok($$ select public.refresh_rate_card() $$, '42501', null, 'customer: cannot rebuild bands');
select throws_ok(
  $$ insert into public.rate_samples (source, import_key, destination_slug, travel_month, hotel_tier, nights, adults, land_total_inr) values ('import', 'x', 'test-isle', 1, '3_star', 3, 2, 1000) $$,
  '42501', null, 'customer: cannot add samples'
);

-- ---------------------------------------------------------------- staff: owner
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@example.com","role":"authenticated"}';

select is((select count(*)::int from public.rate_card where destination_slug = 'test-isle'), 3, 'staff: sees every band, hidden ones too');
select lives_ok(
  $$ insert into public.rate_samples (source, import_key, destination_slug, travel_month, hotel_tier, nights, adults, land_total_inr) values ('import', 'test-staff', 'test-isle', 4, '4_star', 5, 2, 40000) $$,
  'staff: can add a sample'
);
select is((public.refresh_rate_card() ->> 'public_bands')::int > 0, true, 'staff: can rebuild bands');
select is((select sample_count from public.rate_card where destination_slug = 'test-isle' and month = 4), 5, 'staff: the fifth April sample makes that band');

-- ---------------------------------------------------------------- the desk writes samples
reset role;
insert into public.quote_requests (reference, customer_id, channel, request_type, destination, destination_slug, travel_month, nights, adults, hotel_tier)
select 'UDN-TEST-RATE1', id, 'staff', 'package', 'Test Isle', 'test-isle', '2030-03-01', 5, 2, '4_star'
  from public.customers where email = 'asha@example.com';
insert into public.quote_lines (request_id, position, type, description, net_cost, markup_pct)
select id, 1, 'package', 'Hotel, transfers, tours', 50000, 0 from public.quote_requests where reference = 'UDN-TEST-RATE1';
insert into public.quote_lines (request_id, position, type, description, net_cost, markup_pct)
select id, 2, 'flight', 'Return flights', 30000, 0 from public.quote_requests where reference = 'UDN-TEST-RATE1';
insert into public.quote_requests (reference, customer_id, channel, request_type, destination, destination_slug, start_date, end_date, travel_month, nights, adults, hotel_tier)
select 'UDN-TEST-RATE2', id, 'staff', 'hotels', 'Test Isle', 'test-isle', '2030-03-10', '2030-03-13', '2030-03-01', 3, 2, '4_star'
  from public.customers where email = 'asha@example.com';
insert into public.quote_lines (request_id, position, type, description, net_cost, markup_pct)
select id, 1, 'hotel', 'Hotel only', 30000, 0 from public.quote_requests where reference = 'UDN-TEST-RATE2';
select set_config('test.rate1', (select id::text from public.quote_requests where reference = 'UDN-TEST-RATE1'), true);
select set_config('test.rate2', (select id::text from public.quote_requests where reference = 'UDN-TEST-RATE2'), true);

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@example.com","role":"authenticated"}';

select lives_ok(
  $$ select public.send_quote(current_setting('test.rate1')::uuid, now() + interval '3 days', '', '') $$,
  'staff: sends a holiday-package quote'
);
select results_eq(
  $$ select source, travel_month, hotel_tier::text, nights, adults, land_total_inr from public.rate_samples where request_id = current_setting('test.rate1')::uuid $$,
  $$ values ('desk', 3::smallint, '4_star', 5::smallint, 2::smallint, 50000::numeric) $$,
  'sending records a sample of the land price only (the flight line is left out)'
);

reset role;
update public.quote_lines set net_cost = 60000 where type = 'package' and request_id = current_setting('test.rate1')::uuid;
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@example.com","role":"authenticated"}';
select public.send_quote(current_setting('test.rate1')::uuid, now() + interval '3 days', '', '');
select results_eq(
  $$ select count(*)::int, max(land_total_inr) from public.rate_samples where request_id = current_setting('test.rate1')::uuid $$,
  $$ values (1, 60000::numeric) $$,
  'a revision replaces the sample instead of adding one'
);

select public.send_quote(current_setting('test.rate2')::uuid, now() + interval '3 days', '', '');
select is(
  (select count(*)::int from public.rate_samples where request_id = current_setting('test.rate2')::uuid), 0,
  'a hotel-only quote leaves no sample'
);

-- ---------------------------------------------------------------- catalogue and schedules
reset role;
select is(
  (select count(*)::int from public.destinations where slug in ('bali','dubai','goa','kerala','ladakh','maldives','rajasthan') and published),
  7, 'the destination catalogue ships with the migrations'
);
select is(
  (select count(*)::int from cron.job where jobname in ('udan-refresh-rate-card', 'udan-fetch-fx-rates')),
  2, 'nightly rate-card rebuild and daily exchange-rate fetch are scheduled'
);

-- ---------------------------------------------------------------- exchange rates
select is(
  private.store_fx_rates('{"amount":1.0,"base":"EUR","date":"2030-01-02","rates":{"GBP":0.84,"INR":100.0,"USD":1.25}}'),
  '2030-01-02'::date, 'stores a day of ECB rates'
);
select results_eq(
  $$ select currency::text, inr_per_unit from public.fx_rates where rate_date = '2030-01-02' order by currency $$,
  $$ values ('AED', round(80 / 3.6725, 4)), ('EUR', 100.0000), ('GBP', round(100 / 0.84, 4)), ('USD', 80.0000) $$,
  'INR per unit: EUR direct, USD and GBP crossed through EUR, AED from the USD peg'
);
select results_eq(
  $$ select inr_per_unit from public.fx_latest where currency = 'USD' $$,
  $$ values (80.0000) $$,
  'the newest day becomes the display rate'
);
select throws_ok(
  $$ select private.store_fx_rates('{"base":"USD","date":"2030-01-03","rates":{"INR":90}}') $$,
  '22023', null, 'an unexpected response is refused'
);

select * from finish();
rollback;
