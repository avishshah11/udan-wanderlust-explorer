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
| `web/` | Public website: static Astro site in `web/src` (ready, not yet live); the original Vite/React SPA in `web/legacy` still builds the live `docs/` until cutover | Phase 3 done, cutover pending |
| `app/` | Next.js app at app.udantravelsbdq.com: customer account, staff pricing desk, public quote-form endpoint | done (Phase 1-2) |
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
| Sign-in | `/login` (magic link, Google), `/auth/confirm`, `/auth/callback` | everyone |
| Customer account | `/account`, `/account/quotes/<ref>` (accept), `/account/quotes/<ref>/accepted`, `/account/new`, `/account/settings`, `/account/documents/<id>` | signed-in customers, own data only |
| Pricing desk | `/desk` (queue by travel date then budget), `/desk/requests/<id>` (lines, send, messages to the customer, payments, documents, activity), `/desk/new`, `/desk/metrics`, `/desk/markup` | active staff |
| Website form | `POST /api/quote-requests` (form post or JSON), `/quote/received` | public; origin allow-list, honeypot, 5 requests per email per hour |

Emails go out after the response (`after()`), so accepting a quote and
sending one are instant for the person clicking.

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
placeholder price or turnaround language. `verify` serves `dist/` the way
GitHub Pages does and checks every route (including the old SPA URLs) returns
200 HTML with content readable without JavaScript. Set `PUBLIC_APP_URL` to
point the Get a quote form at a local app (default
`https://app.udantravelsbdq.com`).

The Get a quote page (`/quote`) has three sections, one form each: holiday
package, flights only and hotel only. Without JavaScript they stack; with it
they become tabs. Link to one with `/quote#flights`, `/quote#hotels` or
`?type=`, and pre-fill a destination with `?destination=`.

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
`.env.example` next to it.

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` | legacy `web/` contact form | root `.env`; removed with the SPA |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | local Supabase, only if you turn on Google sign-in in `supabase/config.toml` | production values live in the Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `app/` | public |
| `SUPABASE_SECRET_KEY` | `app/` (server only) | bypasses RLS: website form intake, staff alert lookup, notification log |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | `app/` | https://app.udantravelsbdq.com and https://udantravelsbdq.com in production |
| `PUBLIC_APP_URL`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `web/` build | public; in GitHub Actions they are repository variables read by **Deploy website** |
| `QUOTE_FORM_ORIGINS` | `app/` | origins allowed to post the Get a quote form |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | `app/` | without a key, emails are logged, not sent |
| `STAFF_ALERT_EMAIL` | `app/` | fallback when no staff member has alerts on |
| `PAYMENT_DETAILS_BANK`, `PAYMENT_DETAILS_UPI` | `app/` | optional prefill for the desk's payment-details email; the owner supplies these |

## Deploying

### Website (today: legacy SPA)

GitHub Pages serves `main:/docs` (legacy Pages build, custom domain
udantravelsbdq.com). To publish a change to the old site before cutover:

```bash
pnpm --filter @udan/web legacy:build
```

then commit the updated `docs/` and push to `main`. The build also writes
`docs/404.html` (so deep links render) and keeps `docs/CNAME`.

### Website cutover (Astro, needs the owner's go-ahead)

1. Merge this work into `main` and push. Pages still serves `main:/docs`,
   so the live site stays the old SPA, rebuilt with the carousel-arrow fix;
   `docs/_config.yml` keeps the Markdown docs in that folder off the site.
2. Repository Settings > Pages > Source: **GitHub Actions** (or
   `gh api -X PUT repos/avishshah11/udan-wanderlust-explorer/pages -f build_type=workflow`).
   The custom domain and HTTPS certificate stay as they are.
3. Actions > **Deploy website** > Run workflow. It builds, runs the page
   rules and the static verification, and publishes `web/dist`.
4. Check the live site:

   ```bash
   pnpm --filter @udan/web verify https://udantravelsbdq.com
   ```

5. Rollback, if anything is wrong: set the Pages source back to
   **Deploy from a branch**, `main`, `/docs`.
6. Once it has been stable for a few days: add the push trigger and a nightly
   `schedule` (so new rate-card bands reach the site) to `deploy-web.yml`, delete `web/legacy`, `vite.legacy.config.ts` and the
   built files in `docs/`, and move documentation (runbooks, MCP test log,
   review checklist) into `docs/`.

### Database

Create the hosted Supabase project, then link and push migrations (the dev
seed is never pushed):

```bash
pnpm --filter @udan/supabase exec supabase link --workdir .. --project-ref <project-ref>
```

```bash
pnpm --filter @udan/supabase exec supabase db push --workdir ..
```

In the Supabase dashboard: enable email (magic link) and Google sign-in, set
the site URL to https://app.udantravelsbdq.com, and add the first staff member:

```sql
insert into public.staff (user_id, name, email, role)
select id, 'Owner name', email, 'owner' from auth.users where email = '<owner email>';
```

(The owner signs in once first so the auth user exists.)

### App (Vercel)

1. Create a Vercel project from this repository with **Root Directory** `app`
   (Vercel detects the pnpm workspace and installs from the root).
2. Set the environment variables above for Production.
3. Add the domain app.udantravelsbdq.com and create the DNS record Vercel
   shows (a CNAME on the `app` subdomain; the apex stays on GitHub Pages).

In the Supabase dashboard for the hosted project:

- Authentication > URL configuration: site URL
  `https://app.udantravelsbdq.com`, redirect URLs `https://app.udantravelsbdq.com/**`.
- Authentication > Email templates: paste `supabase/templates/magic_link.html`
  into both **Magic Link** and **Confirm signup** (the link uses a token hash,
  so it works on any device).
- Authentication > SMTP: use Resend (`smtp.resend.com`, user `resend`,
  password = the Resend API key) so sign-in emails come from Udan's domain.
- Authentication > Providers > Google: client ID and secret from a Google
  Cloud OAuth client whose redirect URI is
  `https://<project-ref>.supabase.co/auth/v1/callback`.

Resend: verify the sending domain (DNS records shown in Resend) before setting
`EMAIL_FROM` to an address on it.

### Claude connector (Cloudflare Workers)

1. Supabase dashboard > Authentication > OAuth Server: enable it, allow
   dynamic client registration, authorization path `/oauth/consent` (the
   local equivalents are in `supabase/config.toml`).
2. In `mcp/wrangler.jsonc`, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`
   for the hosted project, then add secrets:

   ```bash
   pnpm --filter @udan/mcp exec wrangler secret put RESEND_API_KEY
   ```

   ```bash
   pnpm --filter @udan/mcp exec wrangler secret put STAFF_ALERT_EMAIL
   ```

3. Deploy:

   ```bash
   pnpm --filter @udan/mcp deploy
   ```

4. Custom domain: a Worker can serve `mcp.udantravelsbdq.com` only if the
   `udantravelsbdq.com` DNS zone is on Cloudflare (nameserver change; the
   apex records keep pointing at GitHub Pages). Then uncomment the `routes`
   entry in `wrangler.jsonc` and deploy again.
5. Repeat the Inspector run against the deployed URL, add it to Claude as a
   custom connector, and record the results in `docs/mcp-test-log.md` before
   submitting to the directory.

For the directory reviewer, after they sign in once:

```bash
psql "$DATABASE_URL" -v email=reviewer@example.com -f supabase/scripts/test-account.sql
```

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
