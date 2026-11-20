// Fails the build if any page breaks the website rules (BUILD-PROMPT rule 5,
// PRD website rules): title, description, absolute og:image, og:url,
// canonical, Twitter card, TravelAgency structured data, one h1 with text,
// one founding claim (established 1997), no placeholder prices, no
// turnaround promises.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { findTurnaroundLanguage } from "@udan/core/copy-guard";
import { CF_WEB_ANALYTICS, yearsInBusiness } from "../src/lib/site";
import { canonical, h1Text, meta, title, visibleText } from "./html";

const DIST = new URL("../dist", import.meta.url).pathname;
const ORIGIN = "https://udantravelsbdq.com";

function htmlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : name.endsWith(".html") ? [path] : [];
  });
}

const FOUNDING_CONFLICTS = /\b(?:\d{2}\+?\s*years|three decades|two decades|since (?:19(?:[0-8]\d|9[0-68])|20\d\d)|established (?:in )?(?:19(?:[0-8]\d|9[0-68])|20\d\d))\b/gi;
// The one years claim allowed: the exact count since 1997 ("29 years" in 2026).
const YEARS_CLAIM = `${yearsInBusiness()} years`;
const PLACEHOLDER_PRICE = /starting from\s*(?:₹|rs\.?|inr)/i;

const files = htmlFiles(DIST);
const problems: string[] = [];

for (const file of files) {
  const rel = relative(DIST, file);
  const html = readFileSync(file, "utf8");
  const text = visibleText(html);
  const is404 = rel === "404.html";
  const fail = (msg: string) => problems.push(`${rel}: ${msg}`);

  if (!title(html)) fail("missing <title>");
  if (!meta(html, "name", "description")) fail("missing meta description");
  for (const key of ["og:title", "og:description", "og:url"]) if (!meta(html, "property", key)) fail(`missing ${key}`);
  const og = meta(html, "property", "og:image");
  if (!og || !og.startsWith(`${ORIGIN}/`)) fail(`og:image must be an absolute ${ORIGIN} URL (got ${og ?? "nothing"})`);
  if (meta(html, "name", "twitter:card") !== "summary_large_image") fail("missing twitter:card");
  if (!meta(html, "name", "twitter:image")?.startsWith("https://")) fail("twitter:image must be absolute");
  if (!is404) {
    const c = canonical(html);
    if (!c || !c.startsWith(ORIGIN)) fail(`canonical must be an absolute ${ORIGIN} URL (got ${c ?? "nothing"})`);
  }
  if (!html.includes('"@type":"TravelAgency"')) fail("missing schema.org TravelAgency structured data");
  if ((html.match(/<h1[\s>]/gi) ?? []).length !== 1 || !h1Text(html)) fail("needs exactly one <h1> with text");
  if (!/href="\/quote"|href="\/quote\?/.test(html)) fail("no Get a quote link");
  const founding = [...text.matchAll(FOUNDING_CONFLICTS)].find((m) => m[0].toLowerCase() !== YEARS_CLAIM);
  if (founding) fail(`conflicting founding claim "${founding[0]}" (use: established 1997)`);
  const price = PLACEHOLDER_PRICE.exec(text);
  if (price) fail(`placeholder price "${price[0]}"`);
  for (const t of findTurnaroundLanguage(text)) fail(`turnaround promise "${t.match}" (${t.rule})`);
  if (/gptengineer|lovable/i.test(html)) fail("Lovable artefact in page");
  // The only script from another site is Cloudflare Web Analytics.
  for (const m of html.matchAll(/<script[^>]+src=["']?(https?:\/\/[^"'\s>]+)/gi)) {
    if (m[1] !== CF_WEB_ANALYTICS.script) fail(`third-party script ${m[1]}`);
  }
}

if (files.length === 0) problems.push("dist/ has no HTML files; did astro build run?");

if (problems.length > 0) {
  console.error(`\nWebsite checks failed (${problems.length}):\n${problems.map((p) => `  - ${p}`).join("\n")}\n`);
  process.exit(1);
}
console.log(`Website checks passed for ${files.length} pages.`);
