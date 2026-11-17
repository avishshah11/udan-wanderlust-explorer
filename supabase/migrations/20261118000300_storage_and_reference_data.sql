-- Private bucket for vouchers, tickets, visas, invoices and customers' OTA
-- screenshots. Objects live under <request_id>/..., which is how the
-- policies below decide who can read them. Downloads use signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "documents bucket: staff manage" on storage.objects
  for all to authenticated
  using (bucket_id = 'documents' and (select public.is_staff()))
  with check (bucket_id = 'documents' and (select public.is_staff()));

create policy "documents bucket: customers read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] in (
      select r.id::text from public.quote_requests r
       where r.customer_id = (select public.my_customer_id())
    )
  );

-- Display-only exchange rates. INR per one unit of the foreign currency.
-- Static seed, approximate: RBI reference rates for 6 Nov 2026 (USD, EUR,
-- GBP); AED derived from USD at the 3.6725 peg. Replace with a daily feed
-- (see TODO.md). Every place that shows a converted amount labels it
-- "approx.".
insert into public.fx_rates (currency, rate_date, inr_per_unit, source) values
  ('INR', '2026-11-06', 1,        'identity'),
  ('USD', '2026-11-06', 95.2492,  'static seed: RBI reference rate 06-Nov-2026 (approximate)'),
  ('EUR', '2026-11-06', 106.5451, 'static seed: RBI reference rate 06-Nov-2026 (approximate)'),
  ('GBP', '2026-11-06', 127.6015, 'static seed: RBI reference rate 06-Nov-2026 (approximate)'),
  ('AED', '2026-11-06', 25.9358,  'static seed: USD rate / 3.6725 AED peg (approximate)')
on conflict do nothing;

-- Latest rate per currency, for display.
create view public.fx_latest
with (security_invoker = true) as
select distinct on (currency) currency, rate_date, inr_per_unit, source
  from public.fx_rates
 order by currency, rate_date desc;

grant select on public.fx_latest to anon, authenticated;
