-- Which tables, views, sequences and functions in public each Data API role
-- may use at all (row level security then decides which rows). The hosted
-- project grants nothing automatically, so this list is the whole truth:
-- supabase/migrations/20261120000300_data_api_grants.sql.
-- Run with: pnpm --filter @udan/supabase test:db  (local stack must be running)
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- ---------------------------------------------------------------- tables and views
select set_eq(
  $$
    select c.relname::text, r.role, p.priv
      from pg_class c
     cross join (values ('anon'), ('authenticated'), ('service_role')) r(role)
     cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
       and has_table_privilege(r.role, c.oid, p.priv)
  $$,
  $$
    with expected(role, rel, privs) as (values
      ('anon',          'destinations',        '{SELECT}'),
      ('anon',          'fx_rates',            '{SELECT}'),
      ('anon',          'fx_latest',           '{SELECT}'),
      ('anon',          'rate_card',           '{SELECT}'),
      ('authenticated', 'audit_log',           '{SELECT}'),
      ('authenticated', 'customers',           '{SELECT,INSERT}'),
      ('authenticated', 'destinations',        '{SELECT,INSERT,UPDATE,DELETE}'),
      ('authenticated', 'documents',           '{SELECT,INSERT,DELETE}'),
      ('authenticated', 'fx_latest',           '{SELECT}'),
      ('authenticated', 'fx_rates',            '{SELECT,INSERT,UPDATE,DELETE}'),
      ('authenticated', 'markup_rules',        '{SELECT,INSERT,UPDATE,DELETE}'),
      ('authenticated', 'payments',            '{SELECT,INSERT,UPDATE,DELETE}'),
      ('authenticated', 'quote_lines',         '{SELECT,INSERT,UPDATE,DELETE}'),
      ('authenticated', 'quote_requests',      '{SELECT,UPDATE}'),
      ('authenticated', 'rate_card',           '{SELECT}'),
      ('authenticated', 'rate_import_batches', '{SELECT}'),
      ('authenticated', 'rate_sample_summary', '{SELECT}'),
      ('authenticated', 'rate_samples',        '{SELECT,INSERT,UPDATE,DELETE}'),
      ('authenticated', 'request_messages',    '{SELECT,INSERT}'),
      ('authenticated', 'staff',               '{SELECT,INSERT,UPDATE,DELETE}')
    ),
    service(rel) as (values
      ('audit_log'), ('customers'), ('destinations'), ('documents'), ('fx_latest'), ('fx_rates'),
      ('markup_rules'), ('payments'), ('quote_lines'), ('quote_requests'), ('rate_card'),
      ('rate_import_batches'), ('rate_sample_summary'), ('rate_samples'), ('request_messages'), ('staff')
    )
    select rel, role, unnest(privs::text[]) from expected
    union all
    select rel, 'service_role', unnest('{SELECT,INSERT,UPDATE,DELETE}'::text[]) from service
  $$,
  'each role has exactly the listed table privileges, and none has TRUNCATE'
);

select set_eq(
  $$
    select a.attname::text
      from pg_attribute a
     where a.attrelid = 'public.customers'::regclass and a.attnum > 0 and not a.attisdropped
       and has_column_privilege('authenticated', a.attrelid, a.attnum, 'UPDATE')
  $$,
  $$ values ('name'), ('phone'), ('country'), ('time_zone'), ('display_currency'), ('alert_whatsapp'), ('alert_sms') $$,
  'customers may change only their contact details and alert preferences'
);

select is_empty(
  $$
    select c.relname
      from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
       and (has_any_column_privilege('anon', c.oid, 'INSERT') or has_any_column_privilege('anon', c.oid, 'UPDATE')
            or (c.relname not in ('destinations', 'fx_rates', 'fx_latest', 'rate_card')
                and has_any_column_privilege('anon', c.oid, 'SELECT')))
  $$,
  'signed-out visitors can read the public catalogue and nothing else, and write nothing'
);

-- ---------------------------------------------------------------- functions
select set_eq(
  $$
    select p.proname::text, r.role
      from pg_proc p
     cross join (values ('anon'), ('authenticated'), ('service_role')) r(role)
     where p.pronamespace = 'public'::regnamespace
       and has_function_privilege(r.role, p.oid, 'EXECUTE')
  $$,
  $$
    with helpers(fn) as (values ('is_staff'), ('is_owner'), ('my_customer_id'), ('nights_group')),
    signed_in(fn) as (values
      ('submit_quote_request'), ('quote_for_customer'), ('accept_quote'), ('send_quote'),
      ('desk_metrics'), ('refresh_rate_card'), ('intake_quote_request')
    )
    , service_only(fn) as (values ('create_sign_in_link'), ('use_sign_in_link'))
    select fn, 'anon' from helpers
    union all select fn, r from helpers, (values ('authenticated'), ('service_role')) v(r)
    union all select fn, r from signed_in, (values ('authenticated'), ('service_role')) v(r)
    union all select fn, 'service_role' from service_only
  $$,
  'each role can execute exactly the listed functions'
);

select is_empty(
  $$
    select p.proname
      from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
     where p.pronamespace = 'public'::regnamespace and a.grantee = 0
  $$,
  'no function in public is executable by PUBLIC'
);

-- ---------------------------------------------------------------- sequences
select set_eq(
  $$
    select c.relname::text, r.role, p.priv
      from pg_class c
     cross join (values ('anon'), ('authenticated'), ('service_role')) r(role)
     cross join (values ('USAGE'), ('SELECT'), ('UPDATE')) p(priv)
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
       and has_sequence_privilege(r.role, c.oid, p.priv)
  $$,
  $$ values ('audit_log_id_seq', 'service_role', 'USAGE'), ('audit_log_id_seq', 'service_role', 'SELECT') $$,
  'only service_role uses the audit log sequence'
);

-- ---------------------------------------------------------------- every table is behind row level security
select is_empty(
  $$ select relname from pg_class where relnamespace = 'public'::regnamespace and relkind in ('r', 'p') and not relrowsecurity $$,
  'row level security is on for every table in public'
);

-- ---------------------------------------------------------------- objects created later get nothing
set local role postgres;
create table public.grants_probe (id integer);
create function public.grants_probe_fn() returns integer language sql as 'select 1';
reset role;

select is_empty(
  $$
    select r from (values ('anon'), ('authenticated'), ('service_role')) v(r)
     where has_table_privilege(r, 'public.grants_probe', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE')
  $$,
  'a table created later gives no Data API role any access until a migration grants it'
);

select is_empty(
  $$
    select r from (values ('anon'), ('authenticated'), ('service_role')) v(r)
     where has_function_privilege(r, 'public.grants_probe_fn()', 'EXECUTE')
  $$,
  'a function created later cannot be executed by any Data API role until a migration grants it'
);

select * from finish();
rollback;
