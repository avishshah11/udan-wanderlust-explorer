# MCP server test log

Server: `mcp/` (Cloudflare Worker, stateless Streamable HTTP at `/mcp`).
Authorization server: Supabase Auth OAuth 2.1 (dynamic client registration,
PKCE), consent page at `app/` `/oauth/consent`.

## 18 Nov 2026: local run

**Environment:** `wrangler dev` (port 8787) against the local Supabase stack
(`supabase start`, migrations and dev seed), app on `localhost:3100`. MCP
Inspector CLI 2.15.0.

### OAuth, end to end

| Step | Result |
| --- | --- |
| `GET /.well-known/oauth-protected-resource` | `resource` = MCP URL, `authorization_servers` = Supabase `/auth/v1` |
| Authorization server metadata (`/auth/v1/.well-known/oauth-authorization-server`) | issuer, authorize, token, JWKS and **registration** endpoints; PKCE `S256`; public clients (`none`) |
| Dynamic client registration (`POST /auth/v1/oauth/clients/register`, public client) | client created |
| `GET /oauth/authorize` with PKCE `S256` | 302 to `app /oauth/consent?authorization_id=…` |
| Consent page while signed out | redirected to `/login?next=/oauth/consent…`; magic link signed in and returned to consent |
| Consent page | shows the client's name, the signed-in email and what it can do; **Allow** redirected to the client callback with `code` and the original `state` |
| Second authorization for the same client | consent remembered; redirected straight back |
| Token exchange (`authorization_code` + `code_verifier`) | `access_token`, `refresh_token`, `id_token`; claims `role=authenticated`, `email`, `client_id` |
| MCP call with that token | user verified; database calls ran as that user (row level security) |
| Protected tool with no token | **HTTP 401** with `WWW-Authenticate: Bearer realm="udan", resource_metadata="…/.well-known/oauth-protected-resource"`. Inspector reacted by starting its OAuth flow |

### Every tool through MCP Inspector (CLI)

| # | Call | Signed in | Result |
| --- | --- | --- | --- |
| 1 | `tools/list` | no | 5 tools; each has `title`, `readOnlyHint`, `destructiveHint`, input and output schemas |
| 2 | `get_indicative_price` Bali, 5 nights, 2 adults | no | "No typical price range available yet for Bali" (rate card deferred), best months, typical inclusions; structured content valid |
| 3 | `compare_price` USD 1,500, 10–15 May | no | OTA price ≈ ₹1,42,874 at the approximate rate; commitment; next step; no band yet |
| 4 | `get_quote` | no | 401 challenge (above) |
| 5 | `request_quote` Kerala, 6 nights, 2 adults + 1 child (age 7), 2 itinerary items | yes | `UDN-2611-424VR` created on channel `claude`, status queued; confirmation and desk alert queued |
| 6 | `get_quote` `udn-0000-sentq` (lower case) | yes | normalised; lines, total ₹1,02,525 (approx. AED 3,953), validity, inclusions/exclusions |
| 7 | `confirm_booking` `UDN-0000-SENTQ` | yes | accepted; status `awaiting_payment` in the database; "No payment was taken here" |
| 8 | `confirm_booking` again | yes | `already_accepted`, nothing changed |
| 9 | `get_quote` another customer's reference | yes | not found in this account (no data leaked), actionable message |
| 10 | `get_quote` `12345` (sent as a number by the CLI) | yes | input validation error from the schema |
| 11 | `request_quote` with a past start date | yes | "start_date: The start date is in the past." |

No response contained turnaround language (also asserted in the unit tests).

### Automated tests (`pnpm --filter @udan/mcp test`)

32 tests: directory rules for every tool definition (name length, title,
hints, read/write split, descriptions free of promotion, competitor names,
instructions to the model and turnaround language), every handler path
including sign-in errors, validation, re-check of expired quotes, and the
Worker's HTTP behaviour (metadata, 401 challenge, invalid token, stateless
GET, bad JSON, `AUTH_MODE=all`).

## Still to do before submission

- [ ] Deploy the Worker on a public HTTPS URL (mcp.udantravelsbdq.com) with
      the hosted Supabase project, then repeat the Inspector run against it,
      including the Inspector's own OAuth flow (web UI).
- [ ] Add it to Claude as a custom connector and call every tool from a
      conversation. Confirm that Claude starts sign-in when a protected tool
      answers 401 after connecting without sign-in. If it does not, set
      `AUTH_MODE=all` (every request needs sign-in) and select "always
      required" in the directory portal instead of "required when the server
      asks".
- [ ] Record the results here.
