-- Data API privileges, granted explicitly.
--
-- Supabase projects created from late 2026 no longer give the Data API roles
-- (anon, authenticated, service_role) privileges on new tables, sequences
-- and functions; the local stack (CLI 3.2) still does. The first push to the
-- hosted project on 20 Nov 2026 therefore left every table unreadable by the
-- app, the website and the Claude connector. This migration states the
-- privileges explicitly, so the hosted project and the local stack match,
-- and stops the local stack granting anything automatically from now on, so a
-- missing grant fails locally and in CI exactly as it would hosted.
--
-- Grants decide which tables and operations a role can use at all; row level
-- security still decides which rows. Each role gets an operation on a table
-- only where a policy can allow it (signed-out visitors read the public
-- catalogue and nothing else), and no Data API role keeps TRUNCATE, which
-- would bypass row level security. supabase/tests/data_api_grants.test.sql
-- checks the whole list.
--
-- A new table, view or function in public now needs its own grants in the
-- migration that creates it (README, "Database").

-- ---------------------------------------------------------------------------
-- 1. Nothing automatic for objects created later
-- ---------------------------------------------------------------------------

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;
-- Postgres lets everyone (PUBLIC) execute a new function unless told
-- otherwise, in every schema; only a default without IN SCHEMA can change it.
alter default privileges for role postgres
  revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- 2. Start the existing objects from nothing
-- ---------------------------------------------------------------------------

-- Revoking at table level also clears column grants (customers, below).
revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;
revoke all on all functions in schema public from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. service_role: the server-side key used by the app (intake, emails and
-- their audit rows) and the connector. It bypasses row level security and is
-- never given to a browser.
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ---------------------------------------------------------------------------
-- 4. Anyone, signed in or not: the public catalogue, and the helpers that
-- row level security policies call
-- ---------------------------------------------------------------------------

grant select on public.destinations, public.fx_rates, public.fx_latest, public.rate_card
  to anon, authenticated;

grant execute on function
  public.is_staff(),
  public.is_owner(),
  public.my_customer_id(),
  public.nights_group(integer)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Signed-in customers and staff, one line per table, matching its policies
-- ---------------------------------------------------------------------------

grant select                         on public.audit_log           to authenticated; -- staff read; rows come from triggers and service_role
grant select, insert                 on public.customers           to authenticated; -- own row or staff; staff insert
grant update (name, phone, country, time_zone, display_currency, alert_whatsapp, alert_sms)
                                     on public.customers           to authenticated; -- never email, user link or source
grant insert, update, delete         on public.destinations        to authenticated; -- staff write
grant select, insert, delete         on public.documents           to authenticated; -- own rows or staff; staff write and delete
grant insert, update, delete         on public.fx_rates            to authenticated; -- staff write
grant select, insert, update, delete on public.markup_rules        to authenticated; -- staff only
grant select, insert, update, delete on public.payments            to authenticated; -- own rows or staff; staff write
grant select, insert, update, delete on public.quote_lines         to authenticated; -- staff only
grant select, update                 on public.quote_requests      to authenticated; -- own rows or staff; staff update; new requests go through submit_quote_request
grant select, insert, update, delete on public.rate_samples        to authenticated; -- staff only
grant select                         on public.rate_sample_summary to authenticated; -- security_invoker view over rate_samples
grant select                         on public.rate_import_batches to authenticated; -- security_invoker view over rate_samples
grant select, insert                 on public.request_messages    to authenticated; -- own rows or staff; staff write as themselves
grant select, insert, update, delete on public.staff               to authenticated; -- staff read; owner manages

-- Functions check who is calling themselves (customer or staff).
grant execute on function
  public.submit_quote_request(public.request_channel, jsonb),
  public.quote_for_customer(text),
  public.accept_quote(text),
  public.send_quote(uuid, timestamptz, text, text),
  public.desk_metrics(timestamptz),
  public.refresh_rate_card(),
  public.intake_quote_request(text, text, text, public.request_channel, jsonb)
  to authenticated;
