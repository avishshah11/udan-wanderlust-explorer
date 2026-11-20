# To do

Decisions and work deliberately left out of the current build. Each item says
what is blocked on it.

## Hosted Supabase (project created 20 Nov 2026, Oregon)

- [x] Project `xczzvcrjarigejiekqgb` in us-west-2 (the owner chose to keep
      Oregon over Mumbai), CLI signed in and linked, migrations pushed.
- [x] Data API grants made explicit (the hosted project grants nothing on
      new tables by default; README, "Database").
- [x] Sign-in settings pushed from `[remotes.production]` in
      `supabase/config.toml`: site URL and redirect URLs on
      app.udantravelsbdq.com, and the OAuth server for the Claude connector
      (dynamic client registration, consent at `/oauth/consent`). Today's ECB
      exchange rates fetched; the daily job runs at 16:30 UTC.
- [ ] Resend as SMTP (dashboard > Authentication > SMTP), then run
      `supabase config push` again to apply Udan's sign-in email subject and
      design. The free plan refuses email template changes while Supabase's
      built-in email is used, so they were left out on 20 Nov; `supabase
      config diff` lists those two templates as the only difference. Until
      then sign-in emails are Supabase's standard ones: they reach only
      members of the Supabase organisation, a few an hour, and the link works
      only in the browser that asked for it.
- [ ] Google sign-in, once a Google Cloud OAuth client exists (README, "App").
- [ ] The owner signs in once on the deployed app, then becomes the first
      staff member (README, "Database").
- [ ] Before real customers: move off the free plan, which pauses a project
      after about a week without use.

## Rate card (built 20 Nov 2026)

Built to the owner's decisions: per adult on twin sharing, land only, nights
grouped with a fall-back from the month's band to the all-months band (README,
"Rate card"). What is left needs the owner:

- [ ] Export past quotes (the PRD asks for the last 12 to 24 months) into the
      template on desk > Rate card and import them. Bands appear on the
      website, in Claude and in confirmation emails once 5 quotes back them.
- [ ] Set the repository variables `PUBLIC_SUPABASE_URL`
      (`https://xczzvcrjarigejiekqgb.supabase.co`) and
      `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (dashboard > Settings > API keys; it
      is public by design) so the website build
      reads the bands, and rebuild the site after imports (Actions > Deploy
      website) until the nightly schedule is added at cutover.
- [ ] Add destinations beyond the seven in the catalogue (SQL insert into
      `public.destinations`, slug matching a `web/src/content/destinations`
      page if it has one) before importing quotes for them.

## Needs owner confirmation

- [ ] Claims on the old site that are not verified and were left out of the
      rebuild: "98% visa approval rate", "4.9/5" testimonial, "150+
      destinations", "24/7 support", partner logos (Emirates, Marriott, Air
      India, Hyatt). "10,000+ travellers" and "established 1997" are kept.
- [ ] Supplier terms on displaying prices (PRD action item 1).
- [ ] Markup table: destination group x product type x margin %. No rules are
      seeded; until the owner fills the table (desk > Markup rules), the desk
      asks the pricer for a markup % on any line with no matching rule, and
      logs it as an override.
- [ ] Mailboxes: the site uses udantravels.bdq@gmail.com; the PRD mentions
      quotes@udantravelsbdq.com. Resend needs a verified sending domain.
- [x] udantravelsbdq.com DNS moved to Cloudflare (21 Nov 2026); MX and SPF
      for Namecheap email forwarding kept; GitHub Pages still serves the apex
      through Cloudflare until the cutover.
- [x] App and connector deployed from this Mac to workers.dev (21 Nov 2026,
      `node scripts/deploy.mjs`; values in the git-ignored `.env.cloudflare`).
- [ ] Attach the custom domains app.udantravelsbdq.com and
      mcp.udantravelsbdq.com (uncomment `routes` in each `wrangler.jsonc`,
      deploy again), then the owner signs in and becomes the first staff
      member. Add Resend's sending-domain records in Cloudflare DNS too.
- [ ] Workers Paid (about US$5 a month) before customers rely on the app:
      rendered pages measured 30 to 60 ms of CPU per request against the free
      plan's 10 ms (README, "Cloudflare plan").
- [ ] Taxes: sell prices are treated as tax-inclusive, as the current terms
      say. Confirm with the accountant how GST on packages and TCS on overseas
      packages should appear on quotes before launch.

- [ ] "Why trust us" page (`/trust`): confirm its promises before cutover,
      above all "every payment we ask for appears in your Udan account". That
      only holds if every payment, cash included, is requested from the desk.
- [ ] Registrations for `/trust`, exactly as printed on each certificate:
      GSTIN, and any IATA, TAAI, TAFI, Ministry of Tourism or Gujarat Tourism
      registration (`REGISTRATIONS` in `web/src/lib/site.ts`; hidden while
      empty).
- [ ] The name on the bank account customers pay into (`PAYEE_NAME`), so
      `/trust` can say to pay only an account in that name.
- [ ] Optional, strong trust signals: real photos of the office and the
      family, and traveller testimonials used with their permission. None are
      invented on the site.

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
- [ ] Directory submission: square icon and listing copy are ready
      (`docs/review-checklist.md`); submit once the connector is deployed and
      tested in Claude, from the owner's paid Claude account.
- [ ] Spam protection on the public quote form beyond the honeypot and the
      per-email limit (e.g. Cloudflare Turnstile) if bots find it.

- [x] Daily FX feed: ECB reference rates from frankfurter.dev, fetched by
      pg_cron at 16:30 UTC (AED via the USD peg), labelled approximate. If the
      owner prefers RBI reference rates, swap the source in
      `private.fetch_fx_rates()`.
