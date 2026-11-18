-- Populate a test account for Anthropic's connector review (or any demo).
-- Creates sample quotes in every customer-visible state for one email, all
-- clearly marked TEST. Prices are illustrative, not Udan's.
--
--   psql "$DATABASE_URL" -v email=reviewer@example.com -f supabase/scripts/test-account.sql
--
-- The reviewer signs in with that email (magic link) or Google; the customer
-- row links itself on first sign-in. Safe to run again: it only adds rows.

\set ON_ERROR_STOP on

begin;

insert into public.customers (email, name, country, time_zone, display_currency, source)
values (:'email', 'Connector Review (TEST)', 'US', 'America/Los_Angeles', 'USD', 'claude')
on conflict (email) do nothing;

create temporary table t_ids (k text primary key, id uuid) on commit drop;

-- 1. Received, waiting to be priced
insert into public.quote_requests (customer_id, channel, destination, travel_month, nights, adults, hotel_tier, customer_notes)
select id, 'claude', 'Kerala (TEST)', (date_trunc('month', now()) + interval '4 months')::date, 6, 2, '4_star', 'TEST request for connector review'
  from public.customers where email = :'email';

-- 2. Sent: a quote ready to accept with confirm_booking
with r as (
  insert into public.quote_requests (customer_id, channel, destination, start_date, travel_month, nights, adults, hotel_tier, preferred_currency, customer_notes)
  select id, 'claude', 'Bali (TEST)', (now() + interval '120 days')::date, date_trunc('month', now() + interval '120 days')::date, 5, 2, '4_star', 'USD', 'TEST quote for connector review'
    from public.customers where email = :'email'
  returning id
)
insert into t_ids select 'sent', id from r;
insert into public.quote_lines (request_id, position, type, description, net_cost, markup_pct)
select id, 1, 'hotel'::public.line_type, 'TEST: Ubud, 3 nights, deluxe room with breakfast', 40000, 10 from t_ids where k = 'sent'
union all select id, 2, 'hotel', 'TEST: Seminyak, 2 nights, pool villa with breakfast', 36000, 10 from t_ids where k = 'sent'
union all select id, 3, 'transfer', 'TEST: Private airport and inter-hotel transfers', 5000, 10 from t_ids where k = 'sent';
update public.quote_requests q
   set status = 'sent', quote_version = 1,
       total_sell_inr = (select sum(sell_price) from public.quote_lines where request_id = q.id),
       valid_until = now() + interval '30 days', priced_at = now(), first_sent_at = now(), sent_at = now(),
       inclusions = 'TEST: hotels with breakfast, private transfers', exclusions = 'TEST: flights, visa'
 where id = (select id from t_ids where k = 'sent');

-- 3. Accepted, advance received
with r as (
  insert into public.quote_requests (customer_id, channel, destination, start_date, travel_month, nights, adults, hotel_tier, customer_notes)
  select id, 'web', 'Dubai (TEST)', (now() + interval '60 days')::date, date_trunc('month', now() + interval '60 days')::date, 4, 2, '4_star', 'TEST booking for connector review'
    from public.customers where email = :'email'
  returning id
)
insert into t_ids select 'paid', id from r;
insert into public.quote_lines (request_id, position, type, description, net_cost, markup_pct)
select id, 1, 'package'::public.line_type, 'TEST: Dubai 4 nights, hotel, transfers, desert safari', 90000, 10 from t_ids where k = 'paid';
update public.quote_requests q
   set status = 'sent', quote_version = 1,
       total_sell_inr = (select sum(sell_price) from public.quote_lines where request_id = q.id),
       valid_until = now() + interval '10 days', priced_at = now(), first_sent_at = now(), sent_at = now(),
       inclusions = 'TEST: 4 nights with breakfast, transfers, desert safari', exclusions = 'TEST: flights, visa'
 where id = (select id from t_ids where k = 'paid');
update public.quote_requests set status = 'awaiting_payment', accepted_at = now(), accept_requested_at = now()
 where id = (select id from t_ids where k = 'paid');
insert into public.payments (request_id, kind, amount, method, status, received_at, note)
select id, 'advance', 30000, 'bank', 'received', now(), 'TEST payment record' from t_ids where k = 'paid';

select r.reference, r.destination, r.status
  from public.quote_requests r join public.customers c on c.id = r.customer_id
 where c.email = :'email'
 order by r.created_at;

commit;
