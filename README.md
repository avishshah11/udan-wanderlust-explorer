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
| `web/` | Public website. Currently the original Vite/React SPA, built into `docs/` for GitHub Pages; being migrated to Astro | live |
| `app/` | Next.js app at app.udantravelsbdq.com: customer account and staff pricing desk | Phase 1-2 |
| `mcp/` | Remote MCP server (Cloudflare Workers) at mcp.udantravelsbdq.com | Phase 4 |
| `supabase/` | Migrations, row level security, database functions, dev seed, pgTAP tests | done (Phase 0) |
| `packages/core` | Shared types, markup calculation, currency display, customer status copy, request schema | done (Phase 0) |
| `docs/` | **Today: the live website build output** served by GitHub Pages (`main:/docs`). Becomes documentation only after the Astro cutover | live |
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

### Shared core (`packages/core`)

```bash
pnpm --filter @udan/core test
```

### Website (`web/`, legacy SPA until the Astro migration)

```bash
pnpm --filter @udan/web dev
```

## Environment variables

Secrets are never committed. Each package documents its own variables in an
`.env.example` next to it.

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` | legacy `web/` contact form | root `.env`; removed with the SPA |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | local Supabase, only if you turn on Google sign-in in `supabase/config.toml` | production values live in the Supabase dashboard |

## Deploying

### Website (today)

GitHub Pages serves `main:/docs` (legacy Pages build, custom domain
udantravelsbdq.com). To publish a change to the current site:

```bash
pnpm --filter @udan/web build
```

then commit the updated `docs/` and push to `main`. The build also writes
`docs/404.html` (so deep links render) and keeps `docs/CNAME`.

The move to Astro and a GitHub Actions deploy is Phase 3; the plan is in
`planning/BUILD-PROMPT.md` and the cutover steps will be documented here.

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

## Rules every surface follows

1. No turnaround time is ever shown to a customer (`findTurnaroundLanguage()`
   in `packages/core` checks customer copy in tests).
2. No supplier net rates anywhere public. Public price bands come only from
   the rate card, which is deferred (see `TODO.md`).
3. Firm prices only to signed-in customers in their own account or Claude
   session.
4. Every customer action gets an immediate response and a visible status.
5. Website: real static HTML per route, correct `og:`/`twitter:` meta,
   TravelAgency schema, one founding claim: established 1997.
6. MCP tools follow Anthropic's directory review rules.
