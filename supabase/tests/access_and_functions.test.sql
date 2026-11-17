-- Row level security and desk/customer functions, against the dev seed.
-- Run with: pnpm --filter @udan/supabase test:db  (local stack must be running)
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

-- ---------------------------------------------------------------- anonymous
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';

select throws_ok($$ select count(*) from public.customers $$, '42501', null, 'anon: no access to customers');
select throws_ok($$ select count(*) from public.quote_requests $$, '42501', null, 'anon: no access to quote_requests');
select throws_ok($$ select count(*) from public.quote_lines $$, '42501', null, 'anon: no access to quote_lines');
select ok((select count(*) from public.destinations) > 0, 'anon: reads published destinations');
select ok((select count(*) from public.fx_latest) >= 5, 'anon: reads fx rates');
select throws_ok(
  $$ select * from public.intake_quote_request('x@example.com', 'X', null, 'web', '{"destination":"Goa","travel_month":"2030-01-01","nights":3}') $$,
  '42501', null, 'anon: cannot call intake directly'
);

-- ---------------------------------------------------------------- customer: asha
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-4333-8333-333333333333","email":"asha@example.com","role":"authenticated"}';

select is((select count(*)::int from public.quote_requests), 1, 'customer: sees only own requests');
select is((select reference from public.quote_requests), 'UDN-0000-SENTQ', 'customer: the right request');
select is((select count(*)::int from public.quote_lines), 0, 'customer: cannot read quote_lines (net cost)');
select is((select count(*)::int from public.markup_rules), 0, 'customer: cannot read markup_rules');
select is((select count(*)::int from public.customers), 1, 'customer: sees only own customer row');
select is((select count(*)::int from public.audit_log), 0, 'customer: cannot read audit_log');
select is(public.is_staff(), false, 'customer: is_staff() is false');

select is(
  jsonb_array_length(public.quote_for_customer('udn-0000-sentq') -> 'lines'), 4,
  'customer: quote_for_customer returns priced lines (reference is case-insensitive)'
);
select ok(
  not exists (
    select 1 from jsonb_array_elements(public.quote_for_customer('UDN-0000-SENTQ') -> 'lines') l
     where l ? 'net_cost' or l ? 'markup_pct' or l ? 'supplier_ref'
  ),
  'customer: lines carry no net cost, markup or supplier reference'
);
select is(
  (public.quote_for_customer('UDN-0000-SENTQ') ->> 'total_inr')::numeric, 102525.00,
  'customer: total matches the sum of sell prices'
);
select is(public.quote_for_customer('UDN-0000-ACCPT'), null, 'customer: cannot read another customer''s quote');

select lives_ok($$ update public.customers set name = 'Asha E.' where email = 'asha@example.com' $$,
  'customer: can update own name');
select throws_ok($$ update public.customers set email = 'evil@example.com' $$, '42501', null,
  'customer: cannot change own email');
select is(
  (select count(*)::int from public.customers where name = 'Asha E.'), 1, 'customer: name updated'
);

select throws_ok(
  $$ select * from public.intake_quote_request('x@example.com', 'X', null, 'web', '{"destination":"Goa","travel_month":"2030-01-01","nights":3}') $$,
  '42501', null, 'customer: cannot create requests for someone else'
);
select matches(
  (select reference from public.submit_quote_request('web',
     '{"destination":"Goa","travel_month":"2030-01-01","nights":3,"adults":2}')),
  '^UDN-[0-9]{4}-[2-9A-HJKMNP-Z]{5}$',
  'customer: submit_quote_request returns a reference'
);
select throws_ok(
  $$ select * from public.submit_quote_request('web', '{"destination":"Goa","start_date":"2020-01-01","nights":3}') $$,
  '22023', 'The travel date is in the past.', 'intake rejects past dates with a readable message'
);
select is((select count(*)::int from public.quote_requests), 2, 'customer: new request visible in own list');

-- accept
select is(public.accept_quote('UDN-0000-ACCPT') ->> 'result', 'not_found', 'accept: other customer''s quote is not_found');
select is(public.accept_quote('UDN-0000-SENTQ') ->> 'result', 'accepted', 'accept: sent quote is accepted');
select is((select status::text from public.quote_requests where reference = 'UDN-0000-SENTQ'),
  'awaiting_payment', 'accept: status is awaiting_payment');
select is(public.accept_quote('UDN-0000-SENTQ') ->> 'result', 'already_accepted', 'accept: idempotent');

-- ---------------------------------------------------------------- staff: pricer
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-4222-8222-222222222222","email":"pricer@udan.test","role":"authenticated"}';

select is((select count(*)::int from public.quote_requests), 5, 'staff: sees every request');
select throws_ok(
  $$ update public.quote_lines set markup_pct = 20
      where request_id = (select id from public.quote_requests where reference = 'UDN-0000-SENTQ') $$,
  '23514', null, 'staff: accepted quote lines are frozen'
);

-- send a quote
insert into public.quote_lines (request_id, position, type, description, net_cost, markup_pct)
select id, 1, 'hotel', 'Jaipur and Udaipur hotels', 150000, 10
  from public.quote_requests where reference = 'UDN-0000-PRCNG';
select is(
  (public.send_quote((select id from public.quote_requests where reference = 'UDN-0000-PRCNG'),
                     now() + interval '4 days', 'Hotels with breakfast', 'Flights') ->> 'total_inr')::numeric,
  165000.00, 'staff: send_quote totals the lines'
);
select is((select status::text from public.quote_requests where reference = 'UDN-0000-PRCNG'), 'sent',
  'staff: sent quote has status sent');

-- an expired quote goes back to the pricer when the customer tries to accept
update public.quote_requests set valid_until = now() - interval '1 hour' where reference = 'UDN-0000-PRCNG';

-- payments move the request status
insert into public.payments (request_id, kind, amount, method, status, received_at)
select id, 'advance', 30000, 'upi', 'received', now() from public.quote_requests where reference = 'UDN-0000-ACCPT';
select is((select status::text from public.quote_requests where reference = 'UDN-0000-ACCPT'), 'advance_received',
  'payments: received advance sets advance_received');

select ok((public.desk_metrics() ->> 'quotes_sent')::int >= 3, 'staff: desk_metrics counts sent quotes');

-- ---------------------------------------------------------------- customer: rohan, expired quote
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-8444-444444444444","email":"rohan@example.com","role":"authenticated"}';

select is(public.accept_quote('UDN-0000-PRCNG') ->> 'result', 'recheck', 'accept: expired quote returns recheck');
select throws_ok($$ select public.desk_metrics() $$, '42501', null, 'customer: desk_metrics is staff only');
select throws_ok(
  $$ select public.send_quote((select id from public.quote_requests limit 1), now() + interval '1 day', null, null) $$,
  '42501', null, 'customer: cannot send quotes'
);

-- ---------------------------------------------------------------- storage: documents bucket
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-4222-8222-222222222222","email":"pricer@udan.test","role":"authenticated"}';
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     select 'documents', id::text || '/voucher.pdf' from public.quote_requests where reference = 'UDN-0000-SENTQ' $$,
  'storage: staff can upload to a request folder'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-4333-8333-333333333333","email":"asha@example.com","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id = 'documents'), 1, 'storage: customer sees files for own request');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('documents', gen_random_uuid()::text || '/x.pdf') $$,
  '42501', null, 'storage: customers cannot upload'
);

reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"44444444-4444-4444-8444-444444444444","email":"rohan@example.com","role":"authenticated"}';
select is((select count(*)::int from storage.objects where bucket_id = 'documents'), 0, 'storage: other customers see nothing');

select * from finish();
rollback;
