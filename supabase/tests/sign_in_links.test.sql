-- One-time sign-in links in customer emails (invisible sign-in).
-- Run with: pnpm --filter @udan/supabase test:db  (local stack must be running)
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

create temporary table t (name text primary key, token text) on commit drop;
grant all on t to anon, authenticated, service_role;

-- asha@example.com is a seed customer with an account.
insert into t select 'asha', public.create_sign_in_link(
  (select id from public.customers where email = 'asha@example.com'), '/account/quotes/UDN-0000-SENTQ');

-- ---------------------------------------------------------------- making a link
select matches((select token from t where name = 'asha'), '^[0-9a-f]{64}$', 'a link token is 64 random hex characters');
select ok(
  exists (select 1 from private.sign_in_links where token_hash = extensions.digest((select token from t where name = 'asha'), 'sha256')),
  'the token is stored as its SHA-256 hash'
);
select ok(
  not exists (select 1 from private.sign_in_links where encode(token_hash, 'hex') = (select token from t where name = 'asha')),
  'the token itself is never stored'
);
select ok(
  (select expires_at between now() + interval '7 days' - interval '1 minute' and now() + interval '7 days'
     from private.sign_in_links where token_hash = extensions.digest((select token from t where name = 'asha'), 'sha256')),
  'a link is valid for 7 days'
);
select isnt(
  public.create_sign_in_link((select id from public.customers where email = 'asha@example.com'), '/account'),
  (select token from t where name = 'asha'),
  'every email gets its own link'
);
select is(public.create_sign_in_link(gen_random_uuid(), '/account'), null, 'no link for an unknown customer');

-- Signing in gives every confirmed address a customer record, staff included
-- (the seed's pricer has one); make sure of it either way.
insert into public.customers (email, name, source) values ('pricer@udan.test', 'Dev Pricer', 'web')
on conflict (email) do nothing;
select is(
  public.create_sign_in_link((select id from public.customers where email = 'pricer@udan.test'), '/account'),
  null,
  'no link for a staff member''s address'
);

select throws_ok(
  $$ select public.create_sign_in_link((select id from public.customers where email = 'asha@example.com'), '/desk') $$,
  '23514', null, 'a link opens account pages only'
);
select throws_ok(
  $$ select public.create_sign_in_link((select id from public.customers where email = 'asha@example.com'), '//evil.example/account') $$,
  '23514', null, 'a link never points at another site'
);

-- ---------------------------------------------------------------- using a link
select is(
  public.use_sign_in_link((select token from t where name = 'asha')),
  jsonb_build_object('status', 'ok', 'email', 'asha@example.com', 'next', '/account/quotes/UDN-0000-SENTQ'),
  'a fresh link signs the customer in and opens its page'
);
select is(
  public.use_sign_in_link((select token from t where name = 'asha')) ->> 'status',
  'used',
  'a link works once'
);
select is(
  public.use_sign_in_link((select token from t where name = 'asha')) ->> 'email',
  'asha@example.com',
  'a used link still names the address, so the sign-in page can fill it in'
);

insert into t select 'old', public.create_sign_in_link((select id from public.customers where email = 'asha@example.com'), '/account');
update private.sign_in_links set expires_at = now() - interval '1 second'
 where token_hash = extensions.digest((select token from t where name = 'old'), 'sha256');
select is(public.use_sign_in_link((select token from t where name = 'old')) ->> 'status', 'expired', 'a link stops working after its 7 days');
select ok(
  (select used_at is null from private.sign_in_links where token_hash = extensions.digest((select token from t where name = 'old'), 'sha256')),
  'an expired link is not marked used'
);

select is(public.use_sign_in_link(repeat('a', 64)) ->> 'status', 'unknown', 'an unknown token is refused');
select is(public.use_sign_in_link('not-a-token') ->> 'status', 'unknown', 'a malformed token is refused');
select is(public.use_sign_in_link(null) ->> 'status', 'unknown', 'a missing token is refused');

-- A customer who becomes staff after the email was sent.
insert into t select 'later', public.create_sign_in_link((select id from public.customers where email = 'asha@example.com'), '/account');
update public.staff set email = 'asha@example.com' where email = 'pricer@udan.test';
select is(
  public.use_sign_in_link((select token from t where name = 'later')),
  jsonb_build_object('status', 'refused', 'next', '/account'),
  'a link is refused once its address belongs to staff, and names no address'
);
update public.staff set email = 'pricer@udan.test' where email = 'asha@example.com';

-- ---------------------------------------------------------------- housekeeping
insert into private.sign_in_links (token_hash, customer_id, next_path, expires_at)
values (extensions.digest('ancient', 'sha256'), (select id from public.customers where email = 'asha@example.com'), '/account', now() - interval '31 days');
select isnt(
  public.create_sign_in_link((select id from public.customers where email = 'asha@example.com'), '/account'),
  null,
  'making a link also clears out old ones'
);
select ok(
  not exists (select 1 from private.sign_in_links where token_hash = extensions.digest('ancient', 'sha256')),
  'links that ended over 30 days ago are forgotten'
);

-- ---------------------------------------------------------------- who may call them
set local role anon;
select throws_ok($$ select public.use_sign_in_link(repeat('a', 64)) $$, '42501', null, 'anon: cannot use links directly');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"33333333-3333-4333-8333-333333333333","email":"asha@example.com","role":"authenticated"}';
select throws_ok(
  $$ select public.create_sign_in_link((select id from public.customers where email = 'asha@example.com'), '/account') $$,
  '42501', null, 'customers: cannot make links'
);
select throws_ok($$ select count(*) from private.sign_in_links $$, '42501', null, 'customers: cannot read links');
reset role;

select * from finish();
rollback;
