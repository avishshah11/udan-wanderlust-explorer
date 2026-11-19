-- Access rules.
--
-- Customers see only their own rows. Staff (an active row in public.staff)
-- see everything. Two tables hold numbers that must never reach a customer,
-- quote_lines (net cost, markup, supplier reference) and markup_rules, so
-- they are staff-only; customers read their priced lines through
-- quote_for_customer(), which returns sell prices only.

-- ---------------------------------------------------------------------------
-- Role helpers (used inside policies, so they live in public and are cheap)
-- ---------------------------------------------------------------------------

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s where s.user_id = (select auth.uid()) and s.active
  );
$$;

create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid()) and s.active and s.role = 'owner'
  );
$$;

create function public.my_customer_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.customers c where c.user_id = (select auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.staff enable row level security;
alter table public.destinations enable row level security;
alter table public.markup_rules enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_lines enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.fx_rates enable row level security;
alter table public.audit_log enable row level security;

-- customers
create policy "customers: own row or staff" on public.customers
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy "customers: update own row or staff" on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()))
  with check (user_id = (select auth.uid()) or (select public.is_staff()));
create policy "customers: staff insert" on public.customers
  for insert to authenticated with check ((select public.is_staff()));

-- Customers may change their own contact details and alert preferences, never
-- their email, user link or source.
revoke update on public.customers from authenticated, anon;
grant update (name, phone, country, time_zone, display_currency, alert_whatsapp, alert_sms)
  on public.customers to authenticated;

-- staff
create policy "staff: staff can read" on public.staff
  for select to authenticated using ((select public.is_staff()));
create policy "staff: owner manages" on public.staff
  for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

-- destinations: public catalogue
create policy "destinations: anyone reads published" on public.destinations
  for select to anon, authenticated using (published or (select public.is_staff()));
create policy "destinations: staff write" on public.destinations
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- markup_rules: staff only
create policy "markup_rules: staff only" on public.markup_rules
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- quote_requests: customers read their own; all writes go through functions
-- below or through staff.
create policy "quote_requests: own rows or staff" on public.quote_requests
  for select to authenticated
  using (customer_id = (select public.my_customer_id()) or (select public.is_staff()));
create policy "quote_requests: staff update" on public.quote_requests
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- quote_lines: staff only
create policy "quote_lines: staff only" on public.quote_lines
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- payments
create policy "payments: own rows or staff" on public.payments
  for select to authenticated
  using (
    (select public.is_staff())
    or request_id in (
      select r.id from public.quote_requests r where r.customer_id = (select public.my_customer_id())
    )
  );
create policy "payments: staff write" on public.payments
  for insert to authenticated with check ((select public.is_staff()));
create policy "payments: staff update" on public.payments
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "payments: staff delete" on public.payments
  for delete to authenticated using ((select public.is_staff()));

-- documents
create policy "documents: own rows or staff" on public.documents
  for select to authenticated
  using (
    (select public.is_staff())
    or request_id in (
      select r.id from public.quote_requests r where r.customer_id = (select public.my_customer_id())
    )
  );
create policy "documents: staff write" on public.documents
  for insert to authenticated with check ((select public.is_staff()));
create policy "documents: staff delete" on public.documents
  for delete to authenticated using ((select public.is_staff()));

-- fx_rates: public, display only
create policy "fx_rates: anyone reads" on public.fx_rates
  for select to anon, authenticated using (true);
create policy "fx_rates: staff write" on public.fx_rates
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- audit_log: staff read; rows are written by triggers and functions
create policy "audit_log: staff read" on public.audit_log
  for select to authenticated using ((select public.is_staff()));

-- Nothing is ever exposed to anonymous callers except the public catalogue
-- (destinations, fx_rates) and the functions granted below.
revoke all on public.customers, public.staff, public.markup_rules, public.quote_requests,
  public.quote_lines, public.payments, public.documents, public.audit_log from anon;

-- ---------------------------------------------------------------------------
-- Intake
-- ---------------------------------------------------------------------------

-- Shared by every channel. Validates the essentials (packages/core does the
-- friendly validation first), creates or finds the customer by email, and
-- returns the reference. Not exposed directly.
create function private.create_quote_request(
  p_email text,
  p_name text,
  p_phone text,
  p_channel public.request_channel,
  p_request jsonb
) returns table (request_id uuid, reference text, customer_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid;
  v_start date := nullif(p_request ->> 'start_date', '')::date;
  v_month date := nullif(p_request ->> 'travel_month', '')::date;
  v_request_id uuid;
  v_reference text;
  v_attempt int := 0;
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(length(trim(p_request ->> 'destination')), 0) < 2 then
    raise exception 'Destination is required.' using errcode = 'invalid_parameter_value';
  end if;
  if v_start is null and v_month is null then
    raise exception 'Give a start date or a travel month.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(v_start, (date_trunc('month', v_month) + interval '1 month - 1 day')::date)
       < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'The travel date is in the past.' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.customers as c (email, name, phone, source, display_currency, time_zone, country)
  values (
    p_email,
    nullif(trim(p_name), ''),
    nullif(trim(p_phone), ''),
    p_channel,
    coalesce(nullif(p_request ->> 'preferred_currency', ''), 'INR'),
    nullif(p_request ->> 'time_zone', ''),
    nullif(upper(p_request ->> 'country'), '')
  )
  -- Fill blanks only: an unauthenticated form must not overwrite details
  -- the customer or staff already set.
  on conflict (email) do update
     set name = coalesce(c.name, excluded.name),
         phone = coalesce(c.phone, excluded.phone),
         time_zone = coalesce(c.time_zone, excluded.time_zone),
         country = coalesce(c.country, excluded.country)
  returning c.id into v_customer_id;

  loop
    begin
      insert into public.quote_requests as r (
        customer_id, channel, destination, destination_slug, origin_city,
        start_date, travel_month, nights, adults, children, child_ages, hotel_tier,
        budget_min, budget_max, budget_currency, flexibility, inclusions_wanted,
        requested_items, ota_comparison, customer_notes, preferred_currency
      ) values (
        v_customer_id,
        p_channel,
        trim(p_request ->> 'destination'),
        nullif(p_request ->> 'destination_slug', ''),
        nullif(trim(p_request ->> 'origin_city'), ''),
        v_start,
        coalesce(date_trunc('month', v_start)::date, date_trunc('month', v_month)::date),
        (p_request ->> 'nights')::smallint,
        coalesce((p_request ->> 'adults')::smallint, 2),
        coalesce((p_request ->> 'children')::smallint, 0),
        coalesce(
          array(select jsonb_array_elements_text(p_request -> 'child_ages')::smallint),
          '{}'
        ),
        nullif(p_request ->> 'hotel_tier', '')::public.hotel_tier,
        (p_request ->> 'budget_min')::numeric,
        (p_request ->> 'budget_max')::numeric,
        coalesce(nullif(p_request ->> 'budget_currency', ''), 'INR'),
        coalesce(nullif(p_request ->> 'flexibility', ''), 'fixed')::public.flexibility,
        coalesce(
          array(select jsonb_array_elements_text(p_request -> 'inclusions_wanted')),
          '{}'
        ),
        coalesce(p_request -> 'requested_items', '[]'::jsonb),
        p_request -> 'ota_comparison',
        nullif(trim(p_request ->> 'customer_notes'), ''),
        coalesce(nullif(p_request ->> 'preferred_currency', ''), 'INR')
      )
      returning r.id, r.reference into v_request_id, v_reference;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then
        raise;
      end if;
    end;
  end loop;

  return query select v_request_id, v_reference, v_customer_id;
end $$;

-- Staff (entering phone/WhatsApp requests) and the app's server (anonymous
-- website form, using the service role key).
create function public.intake_quote_request(
  p_email text,
  p_name text,
  p_phone text,
  p_channel public.request_channel,
  p_request jsonb
) returns table (request_id uuid, reference text, customer_id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if not (coalesce(auth.role(), '') = 'service_role' or public.is_staff()) then
    raise exception 'Only the Udan desk can create requests for another person.'
      using errcode = 'insufficient_privilege';
  end if;
  return query select * from private.create_quote_request(p_email, p_name, p_phone, p_channel, p_request);
end $$;

-- A signed-in customer (website account or Claude connector).
create function public.submit_quote_request(
  p_channel public.request_channel,
  p_request jsonb
) returns table (request_id uuid, reference text, customer_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := auth.jwt() ->> 'email';
begin
  if auth.uid() is null or v_email is null then
    raise exception 'Sign in to request a quote.' using errcode = 'insufficient_privilege';
  end if;
  if p_channel not in ('web', 'claude') then
    raise exception 'Channel must be web or claude.' using errcode = 'invalid_parameter_value';
  end if;

  -- Make sure the customer row is linked to this login.
  update public.customers set user_id = auth.uid()
   where email = v_email::extensions.citext and user_id is null;

  return query select * from private.create_quote_request(
    v_email,
    coalesce(p_request ->> 'name', auth.jwt() -> 'user_metadata' ->> 'full_name'),
    p_request ->> 'phone',
    p_channel,
    p_request
  );
end $$;

-- ---------------------------------------------------------------------------
-- Customer reads and accept
-- ---------------------------------------------------------------------------

-- Everything a customer may see about one of their quotes. Priced lines are
-- included once a quote has been sent, with sell prices only.
create function public.quote_for_customer(p_reference text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  r public.quote_requests;
  v_show_price boolean;
begin
  select q.* into r
    from public.quote_requests q
    join public.customers c on c.id = q.customer_id
   where q.reference = upper(trim(p_reference))
     and (c.user_id = auth.uid() or public.is_staff());

  if not found then
    return null;
  end if;

  v_show_price := r.status not in ('queued', 'pricing', 'cancelled') and r.total_sell_inr is not null;

  return jsonb_build_object(
    'reference', r.reference,
    'status', r.status,
    'channel', r.channel,
    'destination', r.destination,
    'origin_city', r.origin_city,
    'start_date', r.start_date,
    'travel_month', to_char(r.travel_month, 'YYYY-MM'),
    'nights', r.nights,
    'adults', r.adults,
    'children', r.children,
    'hotel_tier', r.hotel_tier,
    'preferred_currency', r.preferred_currency,
    'requested_at', r.created_at,
    'quote_version', r.quote_version,
    'sent_at', case when v_show_price then r.sent_at end,
    'valid_until', case when v_show_price then r.valid_until end,
    'is_expired', v_show_price and r.status = 'sent' and r.valid_until is not null and r.valid_until < now(),
    'accepted_at', r.accepted_at,
    'accept_requested_at', r.accept_requested_at,
    'total_inr', case when v_show_price then r.total_sell_inr end,
    'inclusions', case when v_show_price then r.inclusions end,
    'exclusions', case when v_show_price then r.exclusions end,
    'lines', case when v_show_price then coalesce((
      select jsonb_agg(jsonb_build_object(
               'type', l.type, 'description', l.description, 'price_inr', l.sell_price
             ) order by l.position, l.created_at)
        from public.quote_lines l where l.request_id = r.id
    ), '[]'::jsonb) else '[]'::jsonb end,
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', p.kind, 'amount', p.amount, 'currency', p.currency, 'method', p.method,
               'status', p.status, 'requested_at', p.requested_at, 'received_at', p.received_at
             ) order by p.requested_at)
        from public.payments p where p.request_id = r.id
    ), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'type', d.type, 'file_name', d.file_name, 'uploaded_at', d.uploaded_at
             ) order by d.uploaded_at)
        from public.documents d where d.request_id = r.id
    ), '[]'::jsonb)
  );
end $$;

-- Accept a sent quote. Returns a result code instead of raising for the
-- expected outcomes so every caller (account page, Claude) can answer at once:
--   accepted          quote frozen, status awaiting_payment
--   already_accepted  nothing changed
--   recheck           validity window passed; back to the pricer to re-check
--   not_ready         not priced yet (or cancelled)
--   not_found         no such reference in this customer's account
create function public.accept_quote(p_reference text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.quote_requests;
begin
  if auth.uid() is null then
    return jsonb_build_object('result', 'not_found');
  end if;

  select q.* into r
    from public.quote_requests q
    join public.customers c on c.id = q.customer_id
   where q.reference = upper(trim(p_reference)) and c.user_id = auth.uid()
   for update of q;

  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  if r.accepted_at is not null then
    return jsonb_build_object('result', 'already_accepted', 'reference', r.reference, 'status', r.status);
  end if;

  if r.status <> 'sent' then
    return jsonb_build_object('result', 'not_ready', 'reference', r.reference, 'status', r.status);
  end if;

  if r.valid_until is not null and r.valid_until < now() then
    update public.quote_requests
       set status = 'pricing', accept_requested_at = now()
     where id = r.id;
    return jsonb_build_object('result', 'recheck', 'reference', r.reference, 'status', 'pricing');
  end if;

  update public.quote_requests
     set status = 'awaiting_payment', accepted_at = now(), accept_requested_at = now()
   where id = r.id;

  return jsonb_build_object(
    'result', 'accepted',
    'reference', r.reference,
    'status', 'awaiting_payment',
    'total_inr', r.total_sell_inr,
    'quote_version', r.quote_version
  );
end $$;

-- ---------------------------------------------------------------------------
-- Desk
-- ---------------------------------------------------------------------------

-- Freeze the current lines into a sent quote. The app sends the email after
-- this succeeds.
create function public.send_quote(
  p_request_id uuid,
  p_valid_until timestamptz,
  p_inclusions text,
  p_exclusions text
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.quote_requests;
  v_total numeric(12,2);
  v_lines int;
begin
  if not public.is_staff() then
    raise exception 'Only the Udan desk can send quotes.' using errcode = 'insufficient_privilege';
  end if;

  select * into r from public.quote_requests where id = p_request_id for update;
  if not found then
    raise exception 'No request with id %.', p_request_id using errcode = 'no_data_found';
  end if;
  if r.accepted_at is not null then
    raise exception 'Quote % is already accepted. Reopen it before sending a revision.', r.reference
      using errcode = 'check_violation';
  end if;
  if r.status not in ('queued', 'pricing', 'sent') then
    raise exception 'Quote % cannot be sent from status %.', r.reference, r.status
      using errcode = 'check_violation';
  end if;
  if p_valid_until is null or p_valid_until <= now() then
    raise exception 'Set a validity date in the future.' using errcode = 'invalid_parameter_value';
  end if;

  select count(*), sum(sell_price) into v_lines, v_total
    from public.quote_lines where request_id = p_request_id;
  if v_lines = 0 then
    raise exception 'Add at least one priced line before sending.' using errcode = 'check_violation';
  end if;

  update public.quote_requests
     set status = 'sent',
         total_sell_inr = v_total,
         quote_version = quote_version + 1,
         valid_until = p_valid_until,
         inclusions = nullif(trim(p_inclusions), ''),
         exclusions = nullif(trim(p_exclusions), ''),
         priced_at = coalesce(priced_at, now()),
         first_sent_at = coalesce(first_sent_at, now()),
         sent_at = now(),
         accept_requested_at = null
   where id = p_request_id
   returning * into r;

  return jsonb_build_object(
    'reference', r.reference,
    'quote_version', r.quote_version,
    'total_inr', r.total_sell_inr,
    'valid_until', r.valid_until
  );
end $$;

-- Internal metrics for the desk. Turnaround is measured here and nowhere is it
-- shown to customers.
create function public.desk_metrics(p_since timestamptz default now() - interval '90 days')
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  if not public.is_staff() then
    raise exception 'Staff only.' using errcode = 'insufficient_privilege';
  end if;

  with req as (
    select * from public.quote_requests where created_at >= p_since
  ),
  first_advance as (
    select p.request_id, min(p.received_at) as received_at
      from public.payments p
     where p.status = 'received'
     group by p.request_id
  )
  select jsonb_build_object(
    'since', p_since,
    'requests', (select count(*) from req),
    'quotes_sent', (select count(*) from req where first_sent_at is not null),
    'quotes_accepted', (select count(*) from req where accepted_at is not null),
    'accept_rate', (
      select round(count(*) filter (where accepted_at is not null)::numeric
                   / nullif(count(*) filter (where first_sent_at is not null), 0), 3)
        from req
    ),
    'median_hours_to_quote', (
      select round((percentile_cont(0.5) within group (
               order by extract(epoch from first_sent_at - created_at) / 3600))::numeric, 1)
        from req where first_sent_at is not null
    ),
    'median_hours_to_payment', (
      select round((percentile_cont(0.5) within group (
               order by extract(epoch from fa.received_at - r.accepted_at) / 3600))::numeric, 1)
        from req r join first_advance fa on fa.request_id = r.id
       where r.accepted_at is not null
    ),
    'open_queue', (
      select count(*) from public.quote_requests where status in ('queued', 'pricing')
    ),
    'awaiting_payment', (
      select count(*) from public.quote_requests where status = 'awaiting_payment'
    )
  ) into v;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.intake_quote_request(text, text, text, public.request_channel, jsonb)
  from public, anon;
revoke execute on function public.submit_quote_request(public.request_channel, jsonb) from public, anon;
revoke execute on function public.quote_for_customer(text) from public, anon;
revoke execute on function public.accept_quote(text) from public, anon;
revoke execute on function public.send_quote(uuid, timestamptz, text, text) from public, anon;
revoke execute on function public.desk_metrics(timestamptz) from public, anon;

grant execute on function public.intake_quote_request(text, text, text, public.request_channel, jsonb)
  to authenticated, service_role;
grant execute on function public.submit_quote_request(public.request_channel, jsonb) to authenticated;
grant execute on function public.quote_for_customer(text) to authenticated;
grant execute on function public.accept_quote(text) to authenticated;
grant execute on function public.send_quote(uuid, timestamptz, text, text) to authenticated;
grant execute on function public.desk_metrics(timestamptz) to authenticated;
