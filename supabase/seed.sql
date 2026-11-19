-- LOCAL DEVELOPMENT SEED ONLY. Runs on `supabase db reset` against the local
-- stack; it is never applied to the hosted project.
--
-- Every person, email and number here is fake. Markup percentages are dev
-- placeholders, NOT Udan's margins. There is no rate card data (see TODO.md).
--
-- Dev logins (magic link; open the local mail catcher at http://localhost:54324):
--   desk@udan.test      staff, owner
--   pricer@udan.test    staff, pricer
--   asha@example.com    customer in Dubai (AED), has a sent quote
--   rohan@example.com   customer in London (GBP), accepted and awaiting payment

-- ---------------------------------------------------------------------------
-- Auth users (local only)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, '',
       now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.name),
       now(), now(), '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'desk@udan.test',    'Dev Owner'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'pricer@udan.test',  'Dev Pricer'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'asha@example.com',  'Asha Example'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'rohan@example.com', 'Rohan Example')
) as u (id, email, name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
  from auth.users u;

insert into public.staff (user_id, name, email, role) values
  ('11111111-1111-4111-8111-111111111111', 'Dev Owner',  'desk@udan.test',   'owner'),
  ('22222222-2222-4222-8222-222222222222', 'Dev Pricer', 'pricer@udan.test', 'pricer');

-- Customers asha and rohan were created by the auth trigger; fill in details.
update public.customers set country = 'AE', time_zone = 'Asia/Dubai', display_currency = 'AED',
       phone = '+971 50 000 0000'
 where email = 'asha@example.com';
update public.customers set country = 'GB', time_zone = 'Europe/London', display_currency = 'GBP'
 where email = 'rohan@example.com';
-- A phone customer who has never signed in.
insert into public.customers (email, name, phone, country, time_zone, source)
values ('meera@example.com', 'Meera Example', '+91 90000 00000', 'IN', 'Asia/Kolkata', 'staff');

-- ---------------------------------------------------------------------------
-- Destinations (dev catalogue)
-- ---------------------------------------------------------------------------
insert into public.destinations (slug, name, country, destination_group, is_domestic, best_months, typical_inclusions, published) values
  ('kerala',    'Kerala',    'India',     'domestic',        true,  '{10,11,12,1,2,3}', '{"Hotel or houseboat stays","Private car with driver","Breakfast"}', true),
  ('rajasthan', 'Rajasthan', 'India',     'domestic',        true,  '{10,11,12,1,2,3}', '{"Heritage hotels","Private car with driver","Breakfast"}', true),
  ('goa',       'Goa',       'India',     'domestic',        true,  '{11,12,1,2}',      '{"Beach resort","Airport transfers","Breakfast"}', true),
  ('bali',      'Bali',      'Indonesia', 'south-east-asia', false, '{4,5,6,7,8,9}',    '{"Hotel or villa","Airport transfers","Sightseeing tours","Breakfast"}', true),
  ('dubai',     'Dubai',     'UAE',       'middle-east',     false, '{11,12,1,2,3}',    '{"Hotel","Airport transfers","Desert safari","City tour"}', true);

-- ---------------------------------------------------------------------------
-- Markup rules: DEV PLACEHOLDERS, not real margins
-- ---------------------------------------------------------------------------
insert into public.markup_rules (destination_group, product_type, markup_pct, note) values
  (null,              null,      10.00, 'DEV SEED: fallback'),
  ('domestic',        'hotel',    8.00, 'DEV SEED'),
  ('south-east-asia', 'hotel',   12.00, 'DEV SEED'),
  ('south-east-asia', 'package', 10.00, 'DEV SEED'),
  (null,              'flight',   3.00, 'DEV SEED'),
  (null,              'visa',     0.00, 'DEV SEED');

-- ---------------------------------------------------------------------------
-- Quote requests in each state
-- ---------------------------------------------------------------------------
do $$
declare
  v_asha uuid := (select id from public.customers where email = 'asha@example.com');
  v_rohan uuid := (select id from public.customers where email = 'rohan@example.com');
  v_meera uuid := (select id from public.customers where email = 'meera@example.com');
  v_req uuid;
  v_start date := (date_trunc('month', now()) + interval '3 months')::date + 9;
begin
  -- 1. Queued, entered by staff from a phone call
  insert into public.quote_requests (reference, customer_id, channel, destination, destination_slug, travel_month, nights, adults, children, child_ages, hotel_tier, budget_min, budget_max, flexibility, inclusions_wanted, customer_notes, created_at)
  values ('UDN-0000-QUEUE', v_meera, 'staff', 'Kerala', 'kerala', date_trunc('month', v_start)::date, 6, 2, 2, '{8,11}', '4_star', 120000, 160000, 'flexible', '{hotel,transfers,sightseeing}', 'Called the office. Wants one houseboat night.', now() - interval '5 hours');

  -- 2. Pricing, from Claude
  insert into public.quote_requests (reference, customer_id, channel, destination, destination_slug, origin_city, start_date, travel_month, nights, adults, hotel_tier, budget_min, budget_max, budget_currency, preferred_currency, requested_items, status, pricing_started_at, assigned_to, created_at)
  values ('UDN-0000-PRCNG', v_rohan, 'claude', 'Rajasthan: Jaipur, Udaipur', 'rajasthan', 'London', v_start + 20, v_start + 20, 7, 2, '5_star', 2500, 3500, 'GBP', 'GBP',
          '[{"type":"hotel","description":"Jaipur, 3 nights, 5-star"},{"type":"hotel","description":"Udaipur, 4 nights, lake view"},{"type":"transfer","description":"Private car Jaipur to Udaipur"}]',
          'pricing', now() - interval '2 hours', '22222222-2222-4222-8222-222222222222', now() - interval '1 day');

  -- 3. Sent, from the website, with an OTA price to beat
  insert into public.quote_requests (reference, customer_id, channel, destination, destination_slug, start_date, travel_month, nights, adults, hotel_tier, budget_min, budget_max, budget_currency, preferred_currency, ota_comparison, created_at)
  values ('UDN-0000-SENTQ', v_asha, 'web', 'Bali', 'bali', v_start, v_start, 5, 2, '4_star', 1200, 1800, 'USD', 'AED',
          '{"ota_name":"Example OTA","product_name":"Ubud resort, 5 nights","room_type":"Deluxe","price":150000,"currency":"INR"}',
          now() - interval '3 days')
  returning id into v_req;
  insert into public.quote_lines (request_id, position, type, description, net_cost, markup_pct, markup_rule_id) values
    (v_req, 1, 'hotel',    'Ubud, 3 nights, deluxe room with breakfast', 42000, 12, (select id from public.markup_rules where destination_group = 'south-east-asia' and product_type = 'hotel')),
    (v_req, 2, 'hotel',    'Seminyak, 2 nights, pool villa with breakfast', 38000, 12, (select id from public.markup_rules where destination_group = 'south-east-asia' and product_type = 'hotel')),
    (v_req, 3, 'transfer', 'Private airport and inter-hotel transfers', 6000, 10, (select id from public.markup_rules where destination_group is null and product_type is null)),
    (v_req, 4, 'activity', 'Full-day Ubud tour with guide', 5500, 15, null);
  update public.quote_lines set markup_overridden = true where request_id = v_req and type = 'activity';
  update public.quote_requests set status = 'pricing', pricing_started_at = now() - interval '2 days' where id = v_req;
  update public.quote_requests
     set status = 'sent', quote_version = 1, total_sell_inr = (select sum(sell_price) from public.quote_lines where request_id = v_req),
         valid_until = now() + interval '5 days', priced_at = now() - interval '1 day',
         first_sent_at = now() - interval '1 day', sent_at = now() - interval '1 day',
         inclusions = 'Hotels with breakfast, private transfers, Ubud tour with English-speaking guide.',
         exclusions = 'Flights, visa on arrival fee, lunches and dinners, personal expenses.'
   where id = v_req;

  -- 4. Accepted, awaiting payment
  insert into public.quote_requests (reference, customer_id, channel, destination, destination_slug, start_date, travel_month, nights, adults, children, child_ages, hotel_tier, preferred_currency, created_at)
  values ('UDN-0000-ACCPT', v_rohan, 'web', 'Dubai', 'dubai', v_start + 40, v_start + 40, 4, 2, 1, '{6}', '4_star', 'GBP', now() - interval '6 days')
  returning id into v_req;
  insert into public.quote_lines (request_id, position, type, description, net_cost, markup_pct) values
    (v_req, 1, 'package', 'Dubai 4 nights: hotel, transfers, desert safari, city tour', 98000, 10);
  update public.quote_requests
     set status = 'sent', quote_version = 1, total_sell_inr = (select sum(sell_price) from public.quote_lines where request_id = v_req),
         valid_until = now() + interval '2 days', priced_at = now() - interval '4 days',
         first_sent_at = now() - interval '4 days', sent_at = now() - interval '4 days',
         inclusions = '4 nights with breakfast, airport transfers, desert safari with dinner, half-day city tour.',
         exclusions = 'Flights, UAE visa, Tourism Dirham fee paid at the hotel.'
   where id = v_req;
  update public.quote_requests set status = 'awaiting_payment', accepted_at = now() - interval '3 hours',
         accept_requested_at = now() - interval '3 hours'
   where id = v_req;
  insert into public.payments (request_id, kind, amount, method, status, note)
  values (v_req, 'advance', 30000, 'bank', 'awaiting', 'Bank details sent from template');
end $$;
