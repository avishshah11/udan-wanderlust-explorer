# To do

Decisions and work deliberately left out of the current build. Each item says
what is blocked on it.

## Rate card (deferred by owner, 18 Nov 2026)

The rate card turns Udan's past quotes into public price bands. It is not built
yet: there is no `rate_card` table, no aggregation, no seed bands and no CSV
importer. Until it exists, every surface that would show a band says a firm
quote follows by email instead (PRD core flow step 3, "our team is pricing this
for you").

Open decisions, with the recommendation from the build kickoff:

1. **What one band is priced per.**
   - Recommended: per adult on twin sharing. Each past quote is converted to a
     per-adult price; when shown, the band is multiplied by the party's adults.
     Children are priced in the firm quote. Pools the most samples.
   - Alternative: whole trip per party type (couple / family / group). Closest
     to how quotes are written, but needs roughly 3x more quotes before a band
     can be shown.
2. **What a band includes.**
   - Recommended: land only (hotel, transfers, sightseeing, meals as quoted).
     Flights, visa and insurance depend on departure city and passport, so they
     stay out of bands and are priced in every firm quote.
   - Alternative: everything as quoted, including flights.
3. **Granularity and fallback.** With about 10 past quotes per destination
   (PRD goal), very few exact destination x month x tier x nights cells reach
   the 5-sample minimum.
   - Recommended: nights grouped 3-4 / 5-6 / 7-9 / 10+; bands stored per month
     and also rolled up across months; show the most specific band with 5+
     samples and label what it covers.
   - Alternative: exact cells only, as the PRD table literally says.

Work that waits on these decisions:

- [ ] Migration: `rate_samples` (one row per priced trip, from desk sends and
      the historical import) and `rate_card` (bands with `sample_count`; public
      read only where `sample_count >= 5`).
- [ ] `packages/core`: rate-card aggregation (low/high/sample_count) and the
      lookup used by `get_indicative_price` / `compare_price`, with tests.
- [ ] Nightly aggregation (Supabase cron or the MCP Worker's cron trigger).
- [ ] Desk "send quote" writes a rate sample.
- [ ] Seed script with obviously fake bands for 5 destinations (dev only).
- [ ] CSV importer for the owner's historical quotes, with documented columns.
- [ ] Website: price bands on `/destinations/<slug>` and destination cards,
      with a small island that shows the visitor's currency next to INR
      (`currencyForLocale` in packages/core).
- [ ] MCP: `get_indicative_price` and `compare_price` return real bands
      (today they return "no band yet, request a firm quote").

## Needs owner confirmation

- [ ] Claims on the old site that are not verified and were left out of the
      rebuild: "98% visa approval rate", "4.9/5" testimonial, "150+
      destinations", "24/7 support", partner logos (Emirates, Marriott, Air
      India, Hyatt). "10,000+ travellers" and "established 1997" are kept.
- [ ] Supplier terms on displaying prices (PRD action item 1).
- [ ] Markup table: destination group x product type x margin %. No rules are
      seeded; until the owner fills the table, the desk asks the pricer for a
      markup % on any line with no matching rule, and logs it as an override.
- [ ] Mailboxes: the site uses udantravels.bdq@gmail.com; the PRD mentions
      quotes@udantravelsbdq.com. Resend needs a verified sending domain.
- [ ] DNS records for app.udantravelsbdq.com (Vercel), mcp.udantravelsbdq.com
      (Cloudflare) and the Resend sending domain. The apex stays on GitHub
      Pages.
- [ ] Taxes: sell prices are treated as tax-inclusive, as the current terms
      say. Confirm with the accountant how GST on packages and TCS on overseas
      packages should appear on quotes before launch.

- [ ] Review the new website copy: privacy policy and terms (rewritten for
      accounts, sign-in and the Claude connector), the six destination pages
      (summaries, best months, sample itineraries), and pick the top 20
      destinations for pages.
- [ ] Approve the website cutover (README, "Website cutover"), then delete
      the legacy SPA and the old `docs/` build output.

## Engineering follow-ups

- [ ] Deploy the MCP Worker and test it as a custom connector in Claude
      (`docs/mcp-test-log.md`, "Still to do"). Needs the hosted Supabase
      project with its OAuth server enabled, and the udantravelsbdq.com DNS
      zone on Cloudflare for the mcp. custom domain (or another host).
- [ ] Directory submission: square icon, listing copy, test access
      (`docs/review-checklist.md`).
- [ ] Spam protection on the public quote form beyond the honeypot and the
      per-email limit (e.g. Cloudflare Turnstile) if bots find it.

- [ ] Daily FX feed. `fx_rates` is seeded with RBI reference rates for
      6 Nov 2026 (AED via the USD peg), labelled approximate. Pick a source
      and add a daily job.
