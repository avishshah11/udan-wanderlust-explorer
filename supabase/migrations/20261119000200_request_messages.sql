-- Messages from the desk to the customer about one request: a question about
-- the trip, a note on the quote, an update. Staff write them on the desk
-- request page; each one is emailed to the customer (replies go to the
-- reply-to mailbox) and kept here, so the customer sees them in their account
-- and Claude can read them with get_quote. Messages are not edited or
-- deleted once sent.

create table public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.quote_requests (id) on delete cascade,
  sent_by uuid references public.staff (user_id) on delete set null,
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index request_messages_request_idx on public.request_messages (request_id, created_at);

alter table public.request_messages enable row level security;

create policy "request_messages: own rows or staff" on public.request_messages
  for select to authenticated
  using (
    (select public.is_staff())
    or request_id in (
      select r.id from public.quote_requests r where r.customer_id = (select public.my_customer_id())
    )
  );
create policy "request_messages: staff write as themselves" on public.request_messages
  for insert to authenticated
  with check ((select public.is_staff()) and sent_by = (select auth.uid()));

revoke all on public.request_messages from anon;
revoke update, delete, truncate on public.request_messages from authenticated;

-- The customer's view of a request now includes the desk's messages.
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
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
               'body', m.body, 'sent_at', m.created_at, 'from', coalesce(s.name, 'Udan Tours and Travels')
             ) order by m.created_at)
        from public.request_messages m
        left join public.staff s on s.user_id = m.sent_by
       where m.request_id = r.id
    ), '[]'::jsonb)
  );
end $$;
