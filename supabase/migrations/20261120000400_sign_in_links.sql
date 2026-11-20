-- One-time sign-in links in customer emails ("invisible sign-in").
--
-- The owner's decision (20 Nov 2026): every account button in an email to a
-- customer signs them in as they click it, so they never meet a sign-in page.
-- Each email gets its own link: random, used once, valid for 7 days, and tied
-- to the page it opens. Only a SHA-256 hash of the token is stored.
--
-- Links are made only for an existing customer's own email address, only in
-- emails sent to that address (never on a web page: anyone can type any email
-- into the quote form), and never for a staff member's address, checked again
-- when the link is used, so a forwarded or leaked email cannot open the desk.
--
-- The app makes a link as it sends an email and uses it when the customer
-- clicks, then signs them in through Supabase Auth (app/src/app/auth/link).
-- Both functions are service_role only. The 7 days also appear in the email
-- note (packages/core/src/email/layout.ts, SIGN_IN_LINK_DAYS).

create extension if not exists pgcrypto with schema extensions;

create table private.sign_in_links (
  token_hash bytea primary key,
  customer_id uuid not null references public.customers (id) on delete cascade,
  -- An account page, e.g. /account/quotes/UDN-2611-K7QMX; never another site.
  next_path text not null check (next_path ~ '^/account(/[A-Za-z0-9_-]+)*$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index sign_in_links_expires_idx on private.sign_in_links (expires_at);
create index sign_in_links_customer_idx on private.sign_in_links (customer_id);

alter table private.sign_in_links enable row level security;

-- Returns a new token for the customer's email, or null when there is no such
-- customer or the address belongs to staff (that email then carries the
-- plain page link and the usual sign-in).
create function public.create_sign_in_link(p_customer_id uuid, p_next text) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email extensions.citext;
  v_token text;
begin
  select email into v_email from public.customers where id = p_customer_id;
  if not found or exists (select 1 from public.staff where email = v_email) then
    return null;
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.sign_in_links (token_hash, customer_id, next_path, expires_at)
  values (extensions.digest(v_token, 'sha256'), p_customer_id, p_next, now() + interval '7 days');

  -- Forget links that ended more than 30 days ago.
  delete from private.sign_in_links where expires_at < now() - interval '30 days';

  return v_token;
end $$;

-- Uses a token once. Returns {status, email, next}:
--   ok       the caller signs the customer in and opens next
--   used     already used, or
--   expired  past its 7 days: the caller opens next if the visitor is already
--            signed in, or the sign-in page with the email filled in
--   refused  the address now belongs to staff (no email returned)
--   unknown  no such token
create function public.use_sign_in_link(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  l private.sign_in_links;
  v_email text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'unknown');
  end if;

  select * into l from private.sign_in_links
   where token_hash = extensions.digest(p_token, 'sha256')
     for update;
  if not found then
    return jsonb_build_object('status', 'unknown');
  end if;

  select email::text into v_email from public.customers where id = l.customer_id;

  if exists (select 1 from public.staff where email = v_email::extensions.citext) then
    return jsonb_build_object('status', 'refused', 'next', l.next_path);
  end if;
  if l.used_at is not null then
    return jsonb_build_object('status', 'used', 'email', v_email, 'next', l.next_path);
  end if;
  if l.expires_at <= now() then
    return jsonb_build_object('status', 'expired', 'email', v_email, 'next', l.next_path);
  end if;

  update private.sign_in_links set used_at = now() where token_hash = l.token_hash;
  return jsonb_build_object('status', 'ok', 'email', v_email, 'next', l.next_path);
end $$;

-- service_role only (supabase/tests/data_api_grants.test.sql).
revoke execute on function public.create_sign_in_link(uuid, text) from public, anon, authenticated;
revoke execute on function public.use_sign_in_link(text) from public, anon, authenticated;
grant execute on function public.create_sign_in_link(uuid, text) to service_role;
grant execute on function public.use_sign_in_link(text) to service_role;
