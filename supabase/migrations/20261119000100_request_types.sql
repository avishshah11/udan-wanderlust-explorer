-- Three kinds of quote request: a whole holiday package (as before), flights
-- only, or a hotel only. The website, the account, the desk and the Claude
-- connector all write the type; the desk prices every kind the same way
-- (quote_lines), so nothing downstream of intake changes shape.
--
-- Column meaning by type:
--   package  start_date or travel_month, nights           (unchanged)
--   flights  origin_city -> destination, start_date = departure,
--            end_date = return (null for one way), cabin_class; nights unused
--   hotels   destination = city or area, start_date = check-in,
--            end_date = check-out, nights = end_date - start_date, rooms

create type public.request_type as enum ('package', 'flights', 'hotels');
create type public.cabin_class as enum ('economy', 'premium_economy', 'business', 'first');

alter table public.quote_requests
  add column request_type public.request_type not null default 'package',
  add column end_date date,
  add column rooms smallint check (rooms between 1 and 20),
  add column cabin_class public.cabin_class,
  alter column nights drop not null,
  add constraint nights_for_stays check (request_type = 'flights' or nights is not null),
  add constraint end_not_before_start check (end_date is null or (start_date is not null and end_date >= start_date)),
  add constraint flights_need_origin check (request_type <> 'flights' or origin_city is not null),
  add constraint flights_and_hotels_need_date check (request_type = 'package' or start_date is not null),
  add constraint hotel_nights_match_dates check (
    request_type <> 'hotels' or (end_date is not null and end_date > start_date and nights = end_date - start_date)
  );

comment on column public.quote_requests.end_date is 'Flights: return date (null for one way). Hotels: check-out date.';

-- Intake: same signature, now writes the type and its fields and checks what
-- each type needs before anything is stored.
create or replace function private.create_quote_request(
  p_email text,
  p_name text,
  p_phone text,
  p_channel public.request_channel,
  p_request jsonb
) returns table (request_id uuid, reference text, customer_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid;
  v_type public.request_type := coalesce(nullif(p_request ->> 'request_type', ''), 'package')::public.request_type;
  v_start date := nullif(p_request ->> 'start_date', '')::date;
  v_end date := nullif(p_request ->> 'end_date', '')::date;
  v_month date := nullif(p_request ->> 'travel_month', '')::date;
  v_nights smallint := nullif(p_request ->> 'nights', '')::smallint;
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

  if v_type = 'flights' then
    if coalesce(length(trim(p_request ->> 'origin_city')), 0) < 2 then
      raise exception 'Flights need the city you fly from.' using errcode = 'invalid_parameter_value';
    end if;
    if v_start is null then
      raise exception 'Flights need a departure date.' using errcode = 'invalid_parameter_value';
    end if;
    if v_end is not null and v_end < v_start then
      raise exception 'The return date is before the departure date.' using errcode = 'invalid_parameter_value';
    end if;
    v_nights := null;
  elsif v_type = 'hotels' then
    if v_start is null or v_end is null or v_end <= v_start then
      raise exception 'Hotels need a check-in date and a later check-out date.' using errcode = 'invalid_parameter_value';
    end if;
    v_nights := v_end - v_start;
  else
    v_end := null;
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
        customer_id, channel, request_type, destination, destination_slug, origin_city,
        start_date, end_date, travel_month, nights, adults, children, child_ages, rooms,
        hotel_tier, cabin_class, budget_min, budget_max, budget_currency, flexibility,
        inclusions_wanted, requested_items, ota_comparison, customer_notes, preferred_currency
      ) values (
        v_customer_id,
        p_channel,
        v_type,
        trim(p_request ->> 'destination'),
        nullif(p_request ->> 'destination_slug', ''),
        nullif(trim(p_request ->> 'origin_city'), ''),
        v_start,
        v_end,
        coalesce(date_trunc('month', v_start)::date, date_trunc('month', v_month)::date),
        v_nights,
        coalesce((p_request ->> 'adults')::smallint, 2),
        coalesce((p_request ->> 'children')::smallint, 0),
        coalesce(
          array(select jsonb_array_elements_text(p_request -> 'child_ages')::smallint),
          '{}'
        ),
        nullif(p_request ->> 'rooms', '')::smallint,
        nullif(p_request ->> 'hotel_tier', '')::public.hotel_tier,
        case when v_type = 'flights' then nullif(p_request ->> 'cabin_class', '')::public.cabin_class end,
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

-- The customer's view of a request: adds the type and its fields. Sell
-- prices only, as before.
create or replace function public.quote_for_customer(p_reference text)
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
    'request_type', r.request_type,
    'destination', r.destination,
    'origin_city', r.origin_city,
    'start_date', r.start_date,
    'end_date', r.end_date,
    'travel_month', to_char(r.travel_month, 'YYYY-MM'),
    'nights', r.nights,
    'adults', r.adults,
    'children', r.children,
    'rooms', r.rooms,
    'hotel_tier', r.hotel_tier,
    'cabin_class', r.cabin_class,
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
