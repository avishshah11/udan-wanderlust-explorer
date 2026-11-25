# Udan Tours and Travels: quote desk

Website, quote desk and Claude connector for Udan Tours and Travels, a family
travel agency in Vadodara, established 1997. The product brief is
[`planning/PRD.md`](planning/PRD.md); engineering decisions and build order
are in [`planning/BUILD-PROMPT.md`](planning/BUILD-PROMPT.md). Deferred work
and decisions waiting on the owner are in [`TODO.md`](TODO.md).

Customers ask for a trip price on the website, by email or through Claude. A
family member prices it by hand against supplier rates on the pricing desk,
and the firm quote lands in the customer's account and inbox. The customer
accepts in their account; staff collect payment by hand and record it.

## Repository layout

| Path | What it is | Status |
| --- | --- | --- |
| `web/` | Public website: static Astro site in `web/src` (ready, not yet live; served by Cloudflare from the cutover); the original Vite/React SPA in `web/legacy` still builds the live `docs/` until cutover | Phase 3 done, cutover pending |
| `app/` | Next.js app at app.udantravelsbdq.com (a Cloudflare Worker via OpenNext): customer account, staff pricing desk, public quote-form endpoint | done (Phase 1-2), not deployed |
| `mcp/` | Remote MCP server (Cloudflare Workers) at mcp.udantravelsbdq.com: the Claude connector, OAuth via Supabase | done (Phase 4), not deployed |
| `supabase/` | Migrations, row level security, database functions, dev seed, pgTAP tests | done (Phase 0) |
| `packages/core` | Shared types, markup calculation, currency display, customer status copy, request schema, email templates and senders | done |
| `docs/` | **Today: the live website build output** served by GitHub Pages (`main:/docs`), plus documentation kept off the site by `docs/_config.yml`: `runbooks/`, `mcp-test-log.md`, `review-checklist.md`. Documentation only after the Astro cutover | live |
| `planning/` | PRD and build prompt | reference |

## Prerequisites

- Node 24 (`.nvmrc`) and pnpm 11 (`corepack enable`)
- Docker, for the local Supabase stack

```bash
pnpm install
```

## Running things

Everything at once, as CI does:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### Database (`supabase/`)

The local stack runs Postgres, Auth, Storage and a mail catcher in Docker.
`start` applies every migration and the dev seed.

```bash
pnpm --filter @udan/supabase start
```

```bash
pnpm --filter @udan/supabase test:db
```

```bash
pnpm --filter @udan/supabase reset
```

After changing a migration, regenerate the shared types (CI fails if they are
stale):

```bash
pnpm --filter @udan/supabase gen:types
```

Local URLs: API `http://127.0.0.1:54321`, Postgres `127.0.0.1:54322`
(postgres/postgres), mail catcher `http://127.0.0.1:54324` (magic links land
here). Dev logins and fake data are listed at the top of
[`supabase/seed.sql`](supabase/seed.sql).

What the schema enforces:

- Every request has a type. `package`: a whole holiday (destination, start
  date or month, nights). `flights`: air tickets only (from, to, departure,
  return date or one way, cabin class). `hotels`: a stay only (city or area,
  check-in, check-out, rooms; nights are worked out from the dates). The
  website, the account, the desk and the Claude connector all send it, and
  the desk prices every type the same way, with quote lines.
- Customers see only their own rows. Staff (an active row in `staff`) see
  everything.
- `quote_lines` (net cost, markup, supplier reference) and `markup_rules` are
  staff-only. Customers read their quotes through `quote_for_customer()`,
  which returns sell prices only.
- `sell_price` is a generated column, `round(net_cost * (1 + markup_pct/100))`,
  and `packages/core` `computeSellPrice()` is tested against Postgres output.
- Accepting (`accept_quote()`) freezes the lines and sets
  `awaiting_payment`; an expired quote goes back to the pricer instead.
- Every markup override, markup rule edit, status change and payment is
  written to `audit_log`.
- Desk messages (`request_messages`) are written by staff, read by the
  customer they belong to, and never edited. Each is emailed to the customer
  (replies go to `EMAIL_REPLY_TO`) and shown in their account and in Claude's
  `get_quote`.
- The rate card (below): `rate_samples` are staff-only; `rate_card` shows the
  public only bands with 5 or more samples.
- Data API privileges are granted explicitly, table by table, in
  [`20261120000300_data_api_grants.sql`](supabase/migrations/20261120000300_data_api_grants.sql):
  hosted Supabase projects no longer grant `anon`, `authenticated` or
  `service_role` anything on new tables, and that migration stops the local
  stack doing so too. A new table, view or function in `public` needs its own
  `grant` lines (only what its policies can allow) in the migration that
  creates it, and an entry in
  [`supabase/tests/data_api_grants.test.sql`](supabase/tests/data_api_grants.test.sql),
  which fails on any privilege missing or extra.
- The destination catalogue (seven destinations) ships with the migrations,
  so a hosted project has it. Exchange rates for display are fetched daily
  (ECB reference rates via frankfurter.dev, by pg_cron at 16:30 UTC; AED from
  the USD peg) and always labelled approximate.

### Rate card

Typical price ranges from Udan's own past quotes, built to the owner's
decisions of 20 Nov 2026:

- **Per adult on twin sharing.** A sample's land total is divided by its
  adults; only adults-only trips of two or more adults count. Children are
  priced in the firm quote.
- **Land only.** Every quoted line except flights, visa and insurance.
- **Grouping.** Nights 1-2 / 3-4 / 5-6 / 7-9 / 10+, by hotel category; one
  band per month and one across all months. Callers show the month's band when
  it has 5+ samples, otherwise the all-months band (`pickBand()` in
  `packages/core/src/rate-card.ts`). A band's range is the middle half of its
  prices (25th to 75th percentile), rounded out to ₹100.

Samples come from two places. Sending a holiday-package quote on the desk
records one (the land total of its lines; a revision replaces it), and the
desk's **Rate card** page imports past quotes from a CSV (columns documented
on the page and in `packages/core/src/rate-import.ts`; a file with any bad line
imports nothing, re-importing the same file adds nothing, and an import can be
removed as a whole). Bands are rebuilt by pg_cron every night at 02:00 IST,
after each import, and from the desk's "Rebuild ranges now" button.

Where bands appear: destination pages and cards on the website (read at build
time), `get_indicative_price`, `compare_price` and `request_quote` in Claude,
the request-received email, and the customer's request page while it is being
priced. The dev seed adds obviously fake samples for five destinations.

### Shared core (`packages/core`)

```bash
pnpm --filter @udan/core test
```

### App (`app/`): customer account and pricing desk

```bash
cp app/.env.example app/.env.local
```

Fill `app/.env.local` from `pnpm --filter @udan/supabase exec supabase status --workdir ..`
(API URL, publishable key, secret key), then:

```bash
pnpm --filter @udan/app dev
```

Sign in at `/login` with a dev login from `supabase/seed.sql`; the magic
link arrives in the local mail catcher (`http://127.0.0.1:54324`). Without
`RESEND_API_KEY`, transactional emails are printed to the dev server log and
recorded in `audit_log`.

| Area | Routes | Who |
| --- | --- | --- |
| Sign-in | `/login` (magic link, Google), `/auth/confirm`, `/auth/callback`, `/auth/link` (emailed sign-in links) | everyone |
| Customer account | `/account`, `/account/quotes/<ref>` (accept), `/account/quotes/<ref>/accepted`, `/account/new`, `/account/settings`, `/account/documents/<id>` | signed-in customers, own data only |
| Pricing desk | `/desk` (queue by travel date then budget), `/desk/requests/<id>` (lines, send, messages to the customer, payments, documents, activity), `/desk/new`, `/desk/metrics`, `/desk/markup` | active staff |
| Website form | `POST /api/quote-requests` (form post or JSON), `/quote/received` | public; origin allow-list, honeypot, 5 requests per email per hour |

Emails go out after the response (`after()`), so accepting a quote and
sending one are instant for the person clicking.

Invisible sign-in (the owner's decision, 20 Nov 2026): the account button in
every email to a customer signs them in as they click it, so customers rarely
see `/login`. `notifyCustomerById()` asks the database for a one-time link
(`create_sign_in_link()`, migration `20261120000400_sign_in_links.sql`) for
each email: random, stored only as a SHA-256 hash, used once, valid for 7
days, tied to the account page it opens, and never made for a staff member's
address. The link opens `/auth/link`, which posts it straight back (so mail
scanners that fetch links cannot use it up; a Continue button covers browsers
without JavaScript). `/auth/link/continue` uses it once and signs the customer
in through Supabase Auth: a magic link generated and verified on the server,
which also creates the account on a customer's first click. A used or expired
link opens the page if the visitor is already signed in, or the sign-in page
with the address filled in. The email carries a line asking not to forward it.
Links appear only in emails to the customer's own address, never on a web
page or in a JSON response, since anyone can type any address into the quote
form. Staff alerts and the Claude connector's own emails keep plain links.

### Claude connector (`mcp/`)

```bash
cp mcp/.dev.vars.example mcp/.dev.vars
```

Fill in the local publishable key, then:

```bash
pnpm --filter @udan/mcp dev
```

The MCP endpoint is `http://localhost:8787/mcp`. Try it with the MCP
Inspector:

```bash
npx @modelcontextprotocol/inspector --cli http://localhost:8787/mcp --transport http --method tools/list
```

Five tools: `get_indicative_price` and `compare_price` (no sign-in),
`request_quote`, `get_quote` and `confirm_booking` (sign-in). Sign-in is
OAuth 2.1 with Supabase Auth as the authorization server (dynamic client
registration, PKCE); people sign in and approve on the app's
`/oauth/consent` page. Calling a sign-in tool without a token returns HTTP
401 with a `WWW-Authenticate` challenge, which starts the client's OAuth
flow. Set `AUTH_MODE=all` to require sign-in for every request. Test results
are in `docs/mcp-test-log.md`; the directory checklist is in
`docs/review-checklist.md`.

### Website (`web/`)

```bash
pnpm --filter @udan/web dev
```

```bash
pnpm --filter @udan/web build
```

```bash
pnpm --filter @udan/web verify
```

`build` runs `astro build` and then `scripts/check-build.ts`, which fails the
build if any page lacks a title, description, absolute `og:image`, canonical
URL or TravelAgency data, or contains a conflicting founding claim, a
placeholder price, turnaround language or a script from another site other
than Cloudflare Web Analytics. The only years claim allowed is the
exact count since 1997 ("29 years" in 2026), which pages take from
`yearsInBusiness()` in `web/src/lib/site.ts` and which changes on the next
build after 1 January. `verify` serves `dist/` the way
Cloudflare (and GitHub Pages) does and checks every route (including the old SPA URLs) returns
200 HTML with content readable without JavaScript. Set `PUBLIC_APP_URL` to
point the Get a quote form at a local app (default
`https://app.udantravelsbdq.com`).

Cloudflare Web Analytics (no cookies, no personal data; the owner's choice on
21 Nov 2026) is on every page of production builds (`CF_WEB_ANALYTICS` in
`web/src/lib/site.ts`) and on the old site in `docs/` until the cutover. The
privacy policy says so. The app has none: its URLs can carry one-time sign-in
links and quote references.

The Get a quote page (`/quote`) has three sections, one form each: holiday
package, flights only and hotel only. Without JavaScript they stack; with it
they become tabs. Link to one with `/quote#flights`, `/quote#hotels` or
`?type=`, and pre-fill a destination with `?destination=`.

"Why trust us" (`/trust`) says how Udan works and how to tell Udan from
someone using its name: a written quote before any payment, every payment
request visible in the customer's account, no OTPs or PINs, the office
landline to check with. Each promise matches what the app does; keep them in
step. Registrations (GSTIN, memberships) and the name on the bank account
appear there only once filled in as `REGISTRATIONS` and `PAYEE_NAME` in
`web/src/lib/site.ts`. The payment-details email and the customer's quote page
carry the same check-before-you-pay note.

Destination pages come from `web/src/content/destinations/*.md`; the file
name must match the slug in the desk's `destinations` table. Price ranges on
destination pages and cards come from the rate card at build time when
`PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set
(`web/.env.example`); without them the site builds with no prices, and with
them a failed read fails the build. The visitor's currency is added next to
INR in the browser, marked approx.

The old SPA lives in `web/legacy` until cutover:
`pnpm --filter @udan/web legacy:build` rebuilds the live `docs/`.

## Environment variables

Secrets are never committed. Each package documents its own variables in an
`.env.example` next to it (`app/.dev.vars.example` for the app on the local
Cloudflare runtime). In production everything comes from the git-ignored
`.env.cloudflare` through `scripts/deploy.mjs`: public values at build time,
secrets as Worker secrets; plain settings are in each `wrangler.jsonc`
("Deploying").

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` | legacy `web/` contact form | root `.env`; removed with the SPA |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | local Supabase, only if you turn on Google sign-in in `supabase/config.toml` | production values live in the Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `app/` | public |
| `SUPABASE_SECRET_KEY` | `app/` (server only) | bypasses RLS: website form intake, staff alert lookup, notification log |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | `app/` | https://app.udantravelsbdq.com and https://udantravelsbdq.com in production |
| `PUBLIC_APP_URL`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `web/` build | public; set by `scripts/deploy.mjs` from `.env.cloudflare` |
| `QUOTE_FORM_ORIGINS` | `app/` | origins allowed to post the Get a quote form |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | `app/` | without a key, emails are logged, not sent |
| `STAFF_ALERT_EMAIL` | `app/`, `mcp/` | the business inbox: every desk alert, plus staff with alerts on |
| `PAYMENT_DETAILS_BANK`, `PAYMENT_DETAILS_UPI` | `app/` | optional prefill for the desk's payment-details email; the owner supplies these |

## Deploying

Everything runs on Cloudflare (the owner's decision, 21 Nov 2026), as three
Workers on one account, with Supabase for the database:

| Worker | What | Config |
| --- | --- | --- |
| `udan-app` | Customer account and pricing desk (Next.js via OpenNext), app.udantravelsbdq.com | `app/wrangler.jsonc`, `app/open-next.config.ts` |
| `udan-mcp` | Claude connector, mcp.udantravelsbdq.com | `mcp/wrangler.jsonc` |
| `udan-website` | Public website (static files from `web/dist`), udantravelsbdq.com from the cutover | `web/wrangler.jsonc` |

The owner deploys from their Mac (21 Nov 2026), with every deploy value and
secret in the git-ignored `.env.cloudflare` at the repo root (names in
`.env.cloudflare.example`; never commit it or paste it into chat):

```bash
node scripts/deploy.mjs connector
```

```bash
node scripts/deploy.mjs app
```

```bash
node scripts/deploy.mjs website
```

`scripts/deploy.mjs` passes each tool only the values it needs and never
prints them. For the app it moves this repo's `.env*` files and
`app/.dev.vars` aside while it builds and deploys, because OpenNext bakes any
`.env`, `.env.local` or `.env.production` it finds (repo root and `app/`) into
the uploaded bundle; `cf:deploy` then refuses to upload a bundle carrying
anything but `NEXT_PUBLIC_*` values or pointing at localhost
(`app/scripts/check-worker-env.mjs`). That is also why the deploy values are
not in `.env`. Secrets are uploaded as Worker secrets after each deploy; empty
ones are skipped, so filling one in and deploying again adds it. The website
deploy runs the page rules and the route check first.

`.github/workflows/deploy.yml` (**Deploy to Cloudflare**, manual) does the
same from GitHub Actions if a `CLOUDFLARE_API_TOKEN` secret and the public
values as repository variables are ever added; it is unused today.

### One-time Cloudflare setup

1. A Cloudflare account. The domain and the Workers are on the owner's
   account (free plan; see "Cloudflare plan" below).
2. **Add the site** udantravelsbdq.com to Cloudflare, keep every DNS record it
   imports, and change the nameservers at the registrar (Namecheap). Done on
   21 Nov 2026: the email-forwarding MX and SPF records came across, and the
   old site loads through Cloudflare.
3. An **API token** (My Profile > API Tokens > Create token > "Edit
   Cloudflare Workers", for this account and the udantravelsbdq.com zone) in
   `.env.cloudflare` as `CLOUDFLARE_API_TOKEN`, with the other values there.

### Cloudflare plan

Measured on 21 Nov 2026 with `wrangler tail` on the deployed app: the account
redirect takes 2 to 5 ms of CPU per request; rendered pages (sign-in, the
sign-in link page, request received, using a link) take 30 to 60 ms, and 160
to 220 ms on the first request after a deploy. The free plan allows 10 ms per
request (waiting on Supabase does not count) and 100,000 requests a day. No
request failed in the test, but rendered pages are well over the documented
limit, so move to Workers Paid before customers rely on the app: on the free
plan an over-limit request can fail with error 1102.

### Database

The hosted project is `xczzvcrjarigejiekqgb` in AWS `us-west-2` (Oregon),
the owner's choice on 20 Nov 2026. The app and connector Workers are placed
next to it (`"placement": { "region": "aws:us-west-2" }` in their
`wrangler.jsonc`), so each database query is a short hop. Migrations were
first pushed on 20 Nov 2026.

To push new migrations (the dev seed is never pushed): sign the CLI in once
(`supabase login`, then paste the browser's verification code into the
terminal), link once (asks for the database password), then preview and
push. CLI 3.x targets the local stack unless told `--remote`:

```bash
pnpm --filter @udan/supabase exec supabase link --workdir .. --project-ref xczzvcrjarigejiekqgb
```

```bash
pnpm --filter @udan/supabase exec supabase db push --remote --dry-run --workdir ..
```

```bash
pnpm --filter @udan/supabase exec supabase db push --remote --workdir ..
```

Sign-in settings for the hosted project (site URL and redirect URLs, the
sign-in email template and subjects, email confirmation and rate limit, SMTP
through Resend, the OAuth server for the Claude connector) live in the
`[remotes.production]` block at the end of `supabase/config.toml`. Preview,
then apply:

```bash
pnpm --filter @udan/supabase exec supabase config diff --workdir ..
```

```bash
node scripts/deploy.mjs auth
```

Apply them only this way, never with a bare `supabase config push`: the SMTP
password is the Resend API key, which the script reads from `.env.cloudflare`
(a push without it would blank the password). On the free plan Supabase
refuses email template changes while its built-in email is used, so the first
push with templates needs Resend (the "Email" section below). Supabase's
built-in email sends its standard sign-in links only to members of the
Supabase organisation, 2 an hour, and its links work only in the browser that
asked for them.

Then add the first staff member:

```sql
insert into public.staff (user_id, name, email, role)
select id, 'Owner name', email, 'owner' from auth.users where email = '<owner email>';
```

(The owner signs in once first so the auth user exists.)

### App (`udan-app`)

1. Deploy: `node scripts/deploy.mjs app`. It builds the Supabase URL and
   publishable key in, with `https://app.udantravelsbdq.com` as the app's
   address, deploys, then uploads `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`,
   `EMAIL_REPLY_TO`, `STAFF_ALERT_EMAIL`, `PAYMENT_DETAILS_BANK` and
   `PAYMENT_DETAILS_UPI` from `.env.cloudflare` as Worker secrets. Plain
   settings (`EMAIL_FROM`, `QUOTE_FORM_ORIGINS`, `NEXT_PUBLIC_SITE_URL`) are in
   `app/wrangler.jsonc`. First deployed on 21 Nov 2026 to
   https://udan-app.avishshah1108.workers.dev; it runs in Seattle
   (`cf-placement: remote-SEA`), next to the database.
2. Custom domain: app.udantravelsbdq.com (the `routes` entry in
   `app/wrangler.jsonc`; deploying creates its DNS record and certificate).
   Attached on 21 Nov 2026.
3. In the Supabase dashboard: Authentication > Providers > Google: client ID and secret from a Google
   Cloud OAuth client whose redirect URI is
   `https://xczzvcrjarigejiekqgb.supabase.co/auth/v1/callback`.

### Email (Resend)

The app, the connector and Supabase's sign-in emails all send through Resend,
from `quotes@udantravelsbdq.com` (`EMAIL_FROM` in `app/wrangler.jsonc` and
`mcp/wrangler.jsonc`, `admin_email` in `supabase/config.toml`). Set up on
25 Nov 2026. Alerts about new requests go to every active staff member with
alerts on, plus the business inbox in `STAFF_ALERT_EMAIL`, which always gets
them (app and connector). Customers' replies go to `EMAIL_REPLY_TO`.

1. In Resend, add the domain udantravelsbdq.com and add the records it shows
   in Cloudflare DNS: an MX and a TXT record on `send` and a TXT record on
   `resend._domainkey`, plus `_dmarc` (`v=DMARC1; p=none;`). They leave the
   domain's own MX and SPF records (Namecheap mail forwarding) alone.
2. Create an API key with sending access to that domain and put it in
   `.env.cloudflare` as `RESEND_API_KEY`, with `EMAIL_REPLY_TO` (where
   customers' replies go) and `STAFF_ALERT_EMAIL` (who hears about new
   requests).
3. Once Resend shows the domain as verified: `node scripts/deploy.mjs auth`
   (Supabase's sign-in emails), then `node scripts/deploy.mjs app` and
   `node scripts/deploy.mjs connector` (their emails).

To run the app on Cloudflare's runtime locally, against the local Supabase
stack: copy `app/.dev.vars.example` to `app/.dev.vars` and fill it in, then

```bash
pnpm --filter @udan/app run cf:preview
```

CI builds the app the same way (`build:check` is the OpenNext build).
OpenNext's support for Next.js 16's `proxy.ts` (it keeps sign-in sessions
fresh) is marked experimental; it was checked on the local Cloudflare runtime
on 21 Nov 2026 (sign-in, desk and account pages, desk actions, emails sent
after the response, invisible sign-in).

### Claude connector (`udan-mcp`)

1. The Supabase OAuth server (enabled, dynamic client registration,
   authorization path `/oauth/consent`) is set by
   `node scripts/deploy.mjs auth` ("Database" above).
2. Deploy: `node scripts/deploy.mjs connector`. It passes the Supabase URL
   and publishable key from `.env.cloudflare` and uploads `RESEND_API_KEY`,
   `STAFF_ALERT_EMAIL` and `EMAIL_REPLY_TO` as secrets. First deployed on 21 Nov 2026 to
   https://udan-mcp.avishshah1108.workers.dev: five tools listed, the public
   price tool answers from the hosted database, account tools need sign-in.
3. Custom domain: mcp.udantravelsbdq.com (the `routes` entry in
   `mcp/wrangler.jsonc`). Attached on 21 Nov 2026.
4. Repeat the Inspector run against the deployed URL, add it to Claude as a
   custom connector, and record the results in `docs/mcp-test-log.md` before
   submitting to the directory.

For the directory reviewer, after they sign in once:

```bash
psql "$DATABASE_URL" -v email=reviewer@example.com -f supabase/scripts/test-account.sql
```

### Website (today: legacy SPA)

GitHub Pages serves `main:/docs` (legacy Pages build, custom domain
udantravelsbdq.com). To publish a change to the old site before cutover:

```bash
pnpm --filter @udan/web legacy:build
```

then commit the updated `docs/` and push to `main`. The build also writes
`docs/404.html` (so deep links render) and keeps `docs/CNAME`.

### Website cutover (after the app is live; needs the owner's go-ahead)

Done on 26 Nov 2026: udantravelsbdq.com serves the `udan-website` Worker
(steps 1 to 4 below; the owner deleted the four GitHub Pages A records, and
www already redirected to the apex). Cloudflare's "Always Use HTTPS" is on
(set the same day; GitHub Pages used to redirect http to https), so every
http address on the zone redirects with a 301. Left: step 6 after a few
stable days.

The new website's quote form posts to the app, so the app goes live first.

1. Deploy: `node scripts/deploy.mjs website`. It builds, runs the page rules
   and the route check, and publishes `web/dist`. Check the copy on
   its workers.dev address:

   ```bash
   pnpm --filter @udan/web verify https://udan-website.<account>.workers.dev
   ```

2. Note the apex records GitHub Pages uses (Cloudflare DNS: the `A` records
   for udantravelsbdq.com, 185.199.108.153 to 185.199.111.153, and any
   `AAAA`), delete them, uncomment the `routes` entry in `web/wrangler.jsonc`,
   merge and deploy the website again. Cloudflare points the domain at the
   Worker (a minute or two between the two steps).
3. www: make `www` a proxied record and add Rules > Redirect Rules >
   "Redirect from WWW to root", so www.udantravelsbdq.com goes to the apex.
4. Check the live site:

   ```bash
   pnpm --filter @udan/web verify https://udantravelsbdq.com
   ```

5. Rollback, if anything is wrong: remove the custom domain from the Worker
   (Workers > udan-website > Settings > Domains) and recreate the GitHub
   Pages records from step 2. GitHub Pages is still on until step 6.
6. After a few stable days, switch GitHub Pages off (Settings > Pages >
   Unpublish, or
   `gh api -X DELETE repos/avishshah11/udan-wanderlust-explorer/pages`),
   then delete `web/legacy`, `vite.legacy.config.ts`, the `legacy:*` scripts
   and the built site in `docs/` (keeping the documentation there), and add a
   nightly website deploy (from this Mac, or `deploy.yml` with a schedule) so
   new rate-card bands reach the site.

## Rules every surface follows

1. No turnaround time is ever shown to a customer (`findTurnaroundLanguage()`
   in `packages/core` checks customer copy in tests).
2. No supplier net rates anywhere public. Public prices are only rate-card
   bands built from Udan's own quotes, labelled typical with their quote
   counts; a band with fewer than 5 quotes is never public (row level
   security on `rate_card`).
3. Firm prices only to signed-in customers in their own account or Claude
   session.
4. Every customer action gets an immediate response and a visible status.
5. Website: real static HTML per route, correct `og:`/`twitter:` meta,
   TravelAgency schema, one founding claim: established 1997.
6. MCP tools follow Anthropic's directory review rules.
