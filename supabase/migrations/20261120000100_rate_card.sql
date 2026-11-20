-- Rate card: typical price ranges built from Udan's own past quotes.
--
-- The owner's decisions (20 Nov 2026):
--   * Priced per adult on twin sharing. A sample's land total is divided by
--     its adults. Only adults-only trips of two or more adults count towards
--     a band; children are priced in the firm quote.
--   * Land only: every quoted line except flights, visa and insurance, which
--     depend on the departure city and passport.
--   * Nights grouped 1-2 / 3-4 / 5-6 / 7-9 / 10+. One band per month and one
--     across all months; callers show the most specific band that has at
--     least 5 samples (packages/core/src/rate-card.ts).
--
-- A band's range is the middle half of its per-adult prices (25th to 75th
-- percentile), rounded out to the next ₹100, so one unusual quote does not
-- stretch it. Bands are sell prices Udan quoted to customers; supplier net
-- rates never enter this table.
--
-- Samples come from the desk (one per sent holiday-package quote, refreshed
-- when a revision is sent) and from the owner's import of past quotes (desk >
-- Rate card). Bands are rebuilt nightly by pg_cron, after each import, and on
-- demand from the desk.

create type public.nights_group as enum ('1-2', '3-4', '5-6', '7-9', '10+');

create function public.nights_group(p_nights integer) returns public.nights_group
language sql immutable set search_path = '' as $$
  select case
    when p_nights <= 2 then '1-2'
    when p_nights <= 4 then '3-4'
    when p_nights <= 6 then '5-6'
    when p_nights <= 9 then '7-9'
    else '10+'
  end::public.nights_group
$$;

-- ---------------------------------------------------------------------------
-- Samples (internal)
-- ---------------------------------------------------------------------------

create table public.rate_samples (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('desk', 'import')),
  request_id uuid unique references public.quote_requests (id) on delete cascade,
  -- Identifies an imported row, so importing the same file twice adds nothing.
  import_key text unique check (length(import_key) <= 300),
  -- One id per uploaded file, so the desk can undo a whole import.
  import_batch uuid,
  destination_slug text not null references public.destinations (slug) on update cascade on delete cascade,
  travel_month smallint not null check (travel_month between 1 and 12),
  hotel_tier public.hotel_tier not null,
  nights smallint not null check (nights between 1 and 90),
  adults smallint not null check (adults between 1 and 50),
  children smallint not null default 0 check (children between 0 and 20),
  land_total_inr numeric(12,2) not null check (land_total_inr > 0),
  quoted_on date, -- when the quote was sent; unknown for some imported quotes
  note text check (length(note) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint desk_samples_have_request check (source <> 'desk' or request_id is not null),
  constraint imported_samples_have_key check (source <> 'import' or import_key is not null)
);

create index rate_samples_cell_idx on public.rate_samples (destination_slug, hotel_tier, travel_month);
create index rate_samples_batch_idx on public.rate_samples (import_batch) where import_batch is not null;

create trigger rate_samples_touch before update on public.rate_samples
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Bands (public when sample_count >= 5)
-- ---------------------------------------------------------------------------

create table public.rate_card (
  destination_slug text not null references public.destinations (slug) on update cascade on delete cascade,
  month smallint check (month between 1 and 12), -- null: all months
  hotel_tier public.hotel_tier not null,
  nights_group public.nights_group not null,
  pax_basis text not null default 'per_adult_twin_land' check (pax_basis = 'per_adult_twin_land'),
  price_low numeric(12,2) not null check (price_low > 0),
  price_high numeric(12,2) not null,
  sample_count integer not null check (sample_count > 0),
  updated_at timestamptz not null default now(),
  constraint rate_card_cell unique nulls not distinct (destination_slug, month, hotel_tier, nights_group),
  constraint rate_card_range check (price_high >= price_low)
);

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

alter table public.rate_samples enable row level security;
alter table public.rate_card enable row level security;

create policy "rate_samples: staff only" on public.rate_samples
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Rule 2: a band with fewer than 5 samples is never public. Staff see every
-- band so the desk can show progress.
create policy "rate_card: public bands, or staff" on public.rate_card
  for select to anon, authenticated
  using (sample_count >= 5 or (select public.is_staff()));

-- Progress per destination, for the desk (staff only through rate_samples' policy).
create view public.rate_sample_summary
with (security_invoker = true) as
select destination_slug,
       count(*) filter (where source = 'desk') as desk_samples,
       count(*) filter (where source = 'import') as imported_samples,
       count(*) filter (where children = 0 and adults >= 2) as banded_samples
  from public.rate_samples
 group by destination_slug;

-- Uploaded files, newest first, so a wrong file can be removed as a whole.
create view public.rate_import_batches
with (security_invoker = true) as
select import_batch, count(*) as samples, min(created_at) as imported_at, min(created_by::text)::uuid as imported_by
  from public.rate_samples
 where import_batch is not null
 group by import_batch;

revoke all on public.rate_samples, public.rate_sample_summary, public.rate_import_batches from anon;
revoke truncate on public.rate_samples from authenticated;
revoke insert, update, delete, truncate on public.rate_card from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Building bands
-- ---------------------------------------------------------------------------

create function private.refresh_rate_card() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_count integer;
begin
  -- One rebuild at a time; a second caller waits for the first.
  perform pg_advisory_xact_lock(hashtext('udan.refresh_rate_card'));

  delete from public.rate_card where true;

  with s as (
    select destination_slug, travel_month, hotel_tier, public.nights_group(nights) as ng,
           land_total_inr / adults as per_adult
      from public.rate_samples
     where children = 0 and adults >= 2
  ),
  cells as (
    select destination_slug, travel_month as month, hotel_tier, ng, per_adult from s
    union all
    select destination_slug, null::smallint, hotel_tier, ng, per_adult from s
  )
  insert into public.rate_card (destination_slug, month, hotel_tier, nights_group, price_low, price_high, sample_count)
  select destination_slug, month, hotel_tier, ng,
         greatest(floor(percentile_cont(0.25) within group (order by per_adult) / 100) * 100, 100),
         ceil(percentile_cont(0.75) within group (order by per_adult) / 100) * 100,
         count(*)
    from cells
   group by destination_slug, month, hotel_tier, ng;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- The desk's "Rebuild ranges now" button and the import call this.
create function public.refresh_rate_card() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_bands integer;
begin
  if not public.is_staff() then
    raise exception 'Only the Udan desk can rebuild the rate card.' using errcode = 'insufficient_privilege';
  end if;
  v_bands := private.refresh_rate_card();
  return jsonb_build_object(
    'bands', v_bands,
    'public_bands', (select count(*) from public.rate_card where sample_count >= 5)
  );
end $$;

-- One sample per sent holiday-package quote: the land total of its current
-- lines (everything except flights, visa and insurance). Requests that cannot
-- be banded (flights or hotel only, no known destination, no hotel category)
-- leave no sample.
create function private.record_rate_sample(p_request_id uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  r public.quote_requests;
  v_land numeric(12,2);
begin
  select * into r from public.quote_requests where id = p_request_id;
  if not found then
    return;
  end if;

  select sum(sell_price) into v_land
    from public.quote_lines
   where request_id = p_request_id and type not in ('flight', 'visa', 'insurance');

  if r.request_type <> 'package' or r.destination_slug is null or r.hotel_tier is null
     or r.nights is null or coalesce(v_land, 0) <= 0 then
    delete from public.rate_samples where request_id = p_request_id;
    return;
  end if;

  insert into public.rate_samples (source, request_id, destination_slug, travel_month, hotel_tier,
                                   nights, adults, children, land_total_inr, quoted_on)
  values ('desk', r.id, r.destination_slug, extract(month from r.travel_month)::smallint, r.hotel_tier,
          r.nights, r.adults, r.children, v_land, current_date)
  on conflict (request_id) do update
     set destination_slug = excluded.destination_slug,
         travel_month = excluded.travel_month,
         hotel_tier = excluded.hotel_tier,
         nights = excluded.nights,
         adults = excluded.adults,
         children = excluded.children,
         land_total_inr = excluded.land_total_inr,
         quoted_on = excluded.quoted_on;
end $$;

-- send_quote as before, plus the rate sample.
create or replace function public.send_quote(
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

  perform private.record_rate_sample(p_request_id);

  return jsonb_build_object(
    'reference', r.reference,
    'quote_version', r.quote_version,
    'total_inr', r.total_sell_inr,
    'valid_until', r.valid_until
  );
end $$;

revoke execute on function private.refresh_rate_card() from public, anon, authenticated;
revoke execute on function private.record_rate_sample(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_rate_card() from public, anon;
grant execute on function public.refresh_rate_card() to authenticated;

-- ---------------------------------------------------------------------------
-- Nightly rebuild, 02:00 in Vadodara (20:30 UTC)
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule('udan-refresh-rate-card', '30 20 * * *', $$select private.refresh_rate_card()$$);
