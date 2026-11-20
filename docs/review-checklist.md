# Connector directory review checklist

Maps each item of Anthropic's connector pre-submission checklist
(https://claude.com/docs/connectors/building/review-criteria) and submission
requirements (https://claude.com/docs/connectors/building/submission), read
on 18 Nov 2026, to where it is met. Status: **met** (in code, tested),
**ready** (built, needs deployment or a value from the owner), **to do**.

## Design tools that pass review

| Requirement | Where | Status |
| --- | --- | --- |
| Separate read and write tools; no catch-all request tool | Five purpose-built tools in `mcp/src/tools.ts`: read-only `get_indicative_price`, `compare_price`, `get_quote`; write `request_quote`, `confirm_booking`. Test "separates read and write tools" | met |
| Custom query tools reference the API | Not applicable: every tool calls a fixed database function | met |
| Every tool has a `title` and the applicable hint | `TOOL_DEFINITIONS[*].title` and `annotations`: `readOnlyHint: true` on the three reads, `destructiveHint: true` on `confirm_booking` (it fixes a price and commits the customer, so Claude always asks first). Tests check every tool; `tools/list` output in `docs/mcp-test-log.md` | met |
| Tool names of 64 characters or fewer | Longest is `get_indicative_price` (20). Test | met |
| Narrow, accurate descriptions of what the tool does and when to use it | `TOOL_DEFINITIONS[*].description`; each ends with when to use it and whether sign-in is needed. Test requires "Use it" | met |
| No prompt-injection patterns: no directing Claude, no calls to other software, no external instructions, no hidden text, no promotion | Test rejects promotional words, competitor names, "always/never/must/ignore" phrasing and turnaround promises in descriptions. Competitive claims live only on the public `/connector` page, as the PRD says | met |

## Server behaviour and scope

| Requirement | Where | Status |
| --- | --- | --- |
| Valid parameters return a successful response | Inspector run, calls 1–8 | met |
| Detailed, actionable errors; inputs validated | zod input schemas on every tool; `quoteRequestSchema` in `packages/core` adds per-field messages; reference normalisation with help text; unexpected failures return a message with the phone number, not a generic error. Inspector calls 9–11 and unit tests | met |
| Reasonably sized responses | One quote or one result per call; short text plus structured content | met |
| No collecting conversation data beyond what the tool needs | Tools take only trip fields; `notes` is optional free text the user chooses to send | met |
| No querying Claude's memory, chat history or files | Not done anywhere | met |
| First-party APIs; server domain matches the service | The Worker calls Udan's own Supabase project; served at mcp.udantravelsbdq.com (`wrangler.jsonc` route, needs the zone on Cloudflare, see TODO) | ready |
| No money transfer | No payment code anywhere. `confirm_booking` only records acceptance; payment details are emailed by staff. Stated in the tool description, the response and `/connector` | met |
| No AI image, video or audio generation | None | met |

## Submission requirements

| Requirement | Where | Status |
| --- | --- | --- |
| Remote server over HTTPS | Cloudflare Worker; `pnpm --filter @udan/mcp deploy` | ready |
| OAuth 2.0 for account tools | Supabase Auth OAuth 2.1 with dynamic client registration and PKCE; protected-resource metadata at `/.well-known/oauth-protected-resource`; consent at `app /oauth/consent`. Full flow verified locally (`docs/mcp-test-log.md`) | met locally, ready for production |
| Portal "Authentication requirement" | Choose **Required when the server asks**: the two price tools work without sign-in, the other three answer 401 to start OAuth. Fallback `AUTH_MODE=all` if Claude does not start sign-in mid-session | to do at submission |
| Tested in MCP Inspector | Local run in `docs/mcp-test-log.md` | met locally; repeat on the deployed URL |
| Tested as a custom connector in Claude | Needs the deployed URL | to do |
| Public documentation page | `web/src/pages/connector.astro`, live at https://udantravelsbdq.com/connector after the website cutover | ready |
| Privacy policy URL covering collection, use, storage, sharing, retention, contact | `web/src/pages/privacy.astro` (sections 2–5 and 9; names Supabase, Resend, Cloudflare, Google and Anthropic) | ready, owner to review |
| Support contact | udantravels.bdq@gmail.com, +91 93762 14442 (on `/connector`) | ready |
| Icon | `web/public/images/udan-icon-512.png`: 512×512, the Udan logo on white | ready |
| Listing copy (name ≤100, one-liner ≤200, description ≤2,000, categories) | Name "Udan Tours and Travels"; one-liner from the PRD: "Hotel, flight and holiday package quotes from a Vadodara travel agency established 1997, for domestic and international trips from India, priced against agent rates and delivered to your inbox." (193 characters); description below (under 2,000 characters); category Travel | ready |
| Data handling | Own API (Udan's Supabase project); no health data; no sponsored content | ready |
| Test access for review | Reviewers sign in with their own email (magic link) or Google. Then run `supabase/scripts/test-account.sql` with their email to fill the account with a queued request, a sent quote ready to accept and a paid booking. No credentials go in the portal | ready |
| Paid Claude plan for the submitting account | Owner's account | to do |
| Allowed link URIs (optional) | `https://udantravelsbdq.com`, `https://app.udantravelsbdq.com` (tool responses link to the account) | ready |

## Product rules that overlap review

| Rule (BUILD-PROMPT) | Where |
| --- | --- |
| No turnaround time in tool responses | `findTurnaroundLanguage` asserted on every response in `mcp/test/tools.test.ts` |
| No supplier net rates | Tools read quotes only through `quote_for_customer()`, which returns sell prices; `quote_lines` is staff-only under row level security |
| Firm prices only to signed-in users in their own session | `get_quote`/`confirm_booking` need a verified token; the database returns only the caller's quotes (Inspector call 9) |

## Listing description

Paste into the portal's description field (about 1,100 characters):

> Udan Tours and Travels is a family travel agency in Vadodara, Gujarat, established 1997. This connector lets you plan a trip in Claude and have it priced by Udan's team.
>
> - Typical prices: ask what a holiday at a destination usually costs and get the range from Udan's own past quotes for the same hotel category and length of stay, with the number of quotes behind it. Ranges cover hotel, transfers, sightseeing and meals; flights, visa and insurance are priced in the firm quote.
> - Compare a booking-site price: share a hotel or package price you found online and see how it compares with Udan's typical prices.
> - Request a firm quote: send a holiday package, flights or a hotel stay to Udan's pricing desk after a one-step email or Google sign-in. A member of the family prices it against agent rates, and the quote arrives by email and in your Udan account.
> - Read and accept quotes: see a quote's status, price, inclusions and validity, read messages from Udan's team, and accept when you are ready. No payment happens in Claude; payment details follow by email.
>
> Domestic and international trips from India. Prices are in INR, with your currency shown alongside.
