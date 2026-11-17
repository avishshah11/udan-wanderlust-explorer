-- Udan quote desk: core schema.
--
-- Money is INR, numeric(12,2), unless a currency column says otherwise.
-- Customer identity is the email address. A customer row can exist before the
-- person ever signs in (staff enter phone/WhatsApp requests); it is linked to
-- auth.users on first confirmed sign-in with the same email.
--
-- The rate card (rate_card / rate_samples) is deliberately not here yet; see
-- TODO.md.

create extension if not exists citext with schema extensions;

-- Functions that only triggers or other definer functions call. Not exposed
-- through the Data API.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.request_channel as enum ('claude', 'web', 'email', 'staff');

-- Accepting a quote stamps accepted_at and moves straight to awaiting_payment
-- (shown to customers as "Accepted - awaiting payment").
create type public.request_status as enum (
  'queued',            -- received, nobody has started pricing
  'pricing',           -- a pricer is working on it (or re-checking an expired quote)
  'sent',              -- firm quote delivered to the customer
  'awaiting_payment',  -- customer accepted; payment details go out by email
  'advance_received',
  'balance_received',
  'cancelled'
);

create type public.hotel_tier as enum ('3_star', '4_star', '5_star');
create type public.flexibility as enum ('fixed', 'few_days', 'flexible');
create type public.line_type as enum (
  'hotel', 'flight', 'transfer', 'activity', 'visa', 'insurance', 'package', 'other'
);
create type public.payment_kind as enum ('advance', 'balance');
create type public.payment_method as enum ('bank', 'upi', 'card_link', 'cash');
create type public.payment_status as enum ('awaiting', 'received');
create type public.document_type as enum (
  'voucher', 'ticket', 'visa', 'insurance', 'invoice', 'itinerary', 'ota_screenshot', 'other'
);
create type public.staff_role as enum ('owner', 'pricer');

-- ---------------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------------

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Reference numbers customers read over the phone: UDN-YYMM-XXXXX, with an
-- alphabet that drops 0/O, 1/I/L. 31^5 = 28.6M per month, so collisions are
-- rare; the intake function retries on the unique constraint.
create function private.new_reference() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  suffix text := '';
begin
  for i in 1..5 loop
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return 'UDN-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMM') || '-' || suffix;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email extensions.citext not null unique
    check (email operator(extensions.~) '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  name text check (length(name) <= 200),
  phone text check (length(phone) <= 40),
  country char(2),
  time_zone text check (length(time_zone) <= 64),       -- IANA, e.g. Asia/Dubai
  display_currency char(3) not null default 'INR',
  -- Email is always on (it is how quotes are delivered). These are opt-ins
  -- for alert channels that are stored but not yet wired to a provider.
  alert_whatsapp boolean not null default false,
  alert_sms boolean not null default false,
  source public.request_channel not null,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email extensions.citext not null unique,
  role public.staff_role not null default 'pricer',
  active boolean not null default true,
  receives_alerts boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.destinations (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  country text not null,
  -- Markup rules are keyed by group (e.g. domestic, south-east-asia).
  destination_group text not null check (destination_group ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_domestic boolean not null,
  summary text,
  best_months smallint[] not null default '{}'
    check (best_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  typical_inclusions text[] not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.markup_rules (
  id uuid primary key default gen_random_uuid(),
  destination_group text,              -- null = any group
  product_type public.line_type,       -- null = any product type
  markup_pct numeric(5,2) not null check (markup_pct >= 0 and markup_pct <= 200),
  active boolean not null default true,
  note text,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (destination_group, product_type)
);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default private.new_reference(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  channel public.request_channel not null,

  -- What the customer asked for
  destination text not null check (length(destination) between 2 and 200),
  destination_slug text references public.destinations (slug) on update cascade on delete set null,
  origin_city text check (length(origin_city) <= 100),
  start_date date,
  travel_month date not null,          -- first of the month; derived from start_date when given
  nights smallint not null check (nights between 1 and 90),
  adults smallint not null check (adults between 1 and 50),
  children smallint not null default 0 check (children between 0 and 20),
  child_ages smallint[] not null default '{}',
  hotel_tier public.hotel_tier,
  budget_min numeric(12,2) check (budget_min >= 0),
  budget_max numeric(12,2) check (budget_max >= 0),
  budget_currency char(3) not null default 'INR',
  flexibility public.flexibility not null default 'fixed',
  inclusions_wanted text[] not null default '{}',
  -- The customer's itinerary as structured at intake (Claude, web form, desk).
  -- Priced lines live in quote_lines.
  requested_items jsonb not null default '[]' check (jsonb_typeof(requested_items) = 'array'),
  -- OTA price the customer wants beaten: {ota_name, product_name, room_type, price, currency, ...}
  ota_comparison jsonb check (ota_comparison is null or jsonb_typeof(ota_comparison) = 'object'),
  customer_notes text check (length(customer_notes) <= 4000),
  preferred_currency char(3) not null default 'INR',

  -- Desk state
  status public.request_status not null default 'queued',
  quote_version smallint not null default 0,
  valid_until timestamptz,
  total_sell_inr numeric(12,2),
  inclusions text,
  exclusions text,
  assigned_to uuid references public.staff (user_id) on delete set null,
  accept_requested_at timestamptz,     -- customer tried to accept; set even when the quote had expired

  -- Timestamps (internal turnaround metrics come from these; never shown as a promise)
  created_at timestamptz not null default now(),
  pricing_started_at timestamptz,
  priced_at timestamptz,
  first_sent_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint travel_month_is_first_of_month check (extract(day from travel_month) = 1),
  constraint start_date_matches_month check (
    start_date is null or travel_month = date_trunc('month', start_date)::date
  ),
  constraint budget_range check (budget_min is null or budget_max is null or budget_max >= budget_min),
  constraint child_ages_match check (cardinality(child_ages) in (0, children))
);

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests (id) on delete cascade,
  position smallint not null default 0,
  type public.line_type not null,
  description text not null check (length(description) between 1 and 500),
  -- Internal only. Never returned to customers (see quote_for_customer()).
  net_cost numeric(12,2) not null check (net_cost >= 0),
  markup_pct numeric(5,2) not null check (markup_pct >= 0 and markup_pct <= 200),
  markup_rule_id uuid references public.markup_rules (id) on delete set null,
  markup_overridden boolean not null default false,
  -- Same formula as packages/core computeSellPrice(): round half away from zero to the rupee.
  sell_price numeric(12,2) generated always as (round(net_cost * (1 + markup_pct / 100), 0)) stored,
  supplier_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests (id) on delete cascade,
  kind public.payment_kind not null,
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  method public.payment_method not null,
  status public.payment_status not null default 'awaiting',
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  note text,                            -- internal (UTR, bank reference, who called)
  recorded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint received_has_timestamp check ((status = 'received') = (received_at is not null))
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests (id) on delete cascade,
  type public.document_type not null,
  -- Path inside the private 'documents' storage bucket: <request_id>/<file>
  storage_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes integer check (size_bytes >= 0),
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  constraint path_under_request check (storage_path like request_id::text || '/%')
);

-- Display-only conversion. Pricing is always INR.
create table public.fx_rates (
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  rate_date date not null,
  inr_per_unit numeric(12,4) not null check (inr_per_unit > 0),
  source text not null,
  primary key (currency, rate_date)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,                           -- auth.uid() at the time, null for system/service
  action text not null,                 -- status_change, markup_override, markup_rule_change, payment_recorded, ...
  table_name text,
  row_id uuid,
  request_id uuid references public.quote_requests (id) on delete set null,
  detail jsonb not null default '{}'
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index quote_requests_customer_idx on public.quote_requests (customer_id, created_at desc);
create index quote_requests_queue_idx on public.quote_requests (status, travel_month, start_date);
create index quote_lines_request_idx on public.quote_lines (request_id, position);
create index payments_request_idx on public.payments (request_id);
create index documents_request_idx on public.documents (request_id);
create index audit_log_request_idx on public.audit_log (request_id, at);
create index customers_user_idx on public.customers (user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger customers_touch before update on public.customers
  for each row execute function private.touch_updated_at();
create trigger destinations_touch before update on public.destinations
  for each row execute function private.touch_updated_at();
create trigger markup_rules_touch before update on public.markup_rules
  for each row execute function private.touch_updated_at();
create trigger quote_requests_touch before update on public.quote_requests
  for each row execute function private.touch_updated_at();
create trigger quote_lines_touch before update on public.quote_lines
  for each row execute function private.touch_updated_at();
create trigger payments_touch before update on public.payments
  for each row execute function private.touch_updated_at();

-- travel_month always reflects start_date when a date is known.
create function private.set_travel_month() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.start_date is not null then
    new.travel_month := date_trunc('month', new.start_date)::date;
  elsif new.travel_month is not null then
    new.travel_month := date_trunc('month', new.travel_month)::date;
  end if;
  return new;
end $$;

create trigger quote_requests_travel_month before insert or update of start_date, travel_month
  on public.quote_requests for each row execute function private.set_travel_month();

-- Once a customer accepts, the priced lines are frozen. To revise an accepted
-- quote, staff clear accepted_at (which moves it back out of awaiting_payment).
create function private.guard_frozen_lines() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_request_id uuid := coalesce(new.request_id, old.request_id);
  v_ref text;
  v_accepted timestamptz;
begin
  select reference, accepted_at into v_ref, v_accepted
  from public.quote_requests where id = v_request_id;
  if v_accepted is not null then
    raise exception 'Quote % has been accepted, so its lines are frozen. Reopen the quote before changing prices.', v_ref
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;

create trigger quote_lines_frozen before insert or update or delete on public.quote_lines
  for each row execute function private.guard_frozen_lines();

-- Audit: request status changes
create function private.audit_request_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.audit_log (actor, action, table_name, row_id, request_id, detail)
    values (
      auth.uid(), 'status_change', 'quote_requests', new.id, new.id,
      jsonb_build_object(
        'from', case when tg_op = 'INSERT' then null else old.status end,
        'to', new.status,
        'quote_version', new.quote_version
      )
    );
  end if;
  return new;
end $$;

create trigger quote_requests_audit_status after insert or update of status on public.quote_requests
  for each row execute function private.audit_request_status();

-- Audit: per-quote markup overrides (required by the markup spec)
create function private.audit_markup_override() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.markup_overridden and (
    tg_op = 'INSERT'
    or new.markup_pct is distinct from old.markup_pct
    or new.markup_overridden is distinct from old.markup_overridden
  ) then
    insert into public.audit_log (actor, action, table_name, row_id, request_id, detail)
    values (
      auth.uid(), 'markup_override', 'quote_lines', new.id, new.request_id,
      jsonb_build_object(
        'type', new.type,
        'net_cost', new.net_cost,
        'markup_pct', new.markup_pct,
        'previous_markup_pct', case when tg_op = 'INSERT' then null else old.markup_pct end,
        'rule_id', new.markup_rule_id
      )
    );
  end if;
  return new;
end $$;

create trigger quote_lines_audit_override after insert or update on public.quote_lines
  for each row execute function private.audit_markup_override();

-- Audit: markup rule edits
create function private.audit_markup_rule() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor, action, table_name, row_id, detail)
  values (
    auth.uid(), 'markup_rule_change', 'markup_rules', coalesce(new.id, old.id),
    jsonb_build_object(
      'op', lower(tg_op),
      'old', case when tg_op = 'INSERT' then null else to_jsonb(old) end,
      'new', case when tg_op = 'DELETE' then null else to_jsonb(new) end
    )
  );
  return coalesce(new, old);
end $$;

create trigger markup_rules_audit after insert or update or delete on public.markup_rules
  for each row execute function private.audit_markup_rule();

-- Payments: keep the request status in step and log every change.
create function private.sync_payment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.request_status;
begin
  insert into public.audit_log (actor, action, table_name, row_id, request_id, detail)
  values (
    auth.uid(), 'payment_recorded', 'payments', new.id, new.request_id,
    jsonb_build_object('kind', new.kind, 'amount', new.amount, 'currency', new.currency,
                       'method', new.method, 'status', new.status)
  );

  if new.status = 'received' then
    select status into v_status from public.quote_requests where id = new.request_id;
    if new.kind = 'balance' and v_status in ('awaiting_payment', 'advance_received') then
      update public.quote_requests set status = 'balance_received' where id = new.request_id;
    elsif new.kind = 'advance' and v_status = 'awaiting_payment' then
      update public.quote_requests set status = 'advance_received' where id = new.request_id;
    end if;
  end if;
  return new;
end $$;

create trigger payments_sync after insert or update of status, amount, kind on public.payments
  for each row execute function private.sync_payment();

-- Link a confirmed auth user to the customer row with the same email, or
-- create one. Runs on confirmation, not on first OTP request, so only the
-- inbox owner can claim an existing customer record.
create function private.link_customer_to_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_source public.request_channel;
begin
  if new.email is null or new.email_confirmed_at is null then
    return new;
  end if;

  update public.customers
     set user_id = new.id,
         email_verified_at = coalesce(email_verified_at, new.email_confirmed_at)
   where email = new.email::extensions.citext
     and (user_id is null or user_id = new.id);

  if not found then
    v_source := case new.raw_user_meta_data ->> 'source'
                  when 'claude' then 'claude'::public.request_channel
                  else 'web'::public.request_channel
                end;
    insert into public.customers (user_id, email, name, source, email_verified_at)
    values (
      new.id,
      new.email,
      nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
      v_source,
      new.email_confirmed_at
    )
    on conflict (email) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_confirmed
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function private.link_customer_to_user();
