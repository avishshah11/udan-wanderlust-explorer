// Verify every route the way Cloudflare, GitHub Pages and a crawler see it: HTTP 200,
// text/html, real content in the HTML (no JavaScript), og:image reachable.
//
//   pnpm --filter @udan/web verify                      serve dist/ like Cloudflare and GitHub Pages, and check it
//   pnpm --filter @udan/web verify https://udantravelsbdq.com   check the live site after cutover

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { canonical, h1Text, meta, title, visibleText } from "./html";

const DIST = new URL("../dist", import.meta.url).pathname;
// URLs people have been sharing from the old SPA must keep working.
const LEGACY_ROUTES = ["/", "/about", "/packages", "/visa", "/contact", "/privacy", "/terms"];
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };

/** Serve dist/ as Cloudflare (web/wrangler.jsonc) and GitHub Pages do: file, dir/index.html, name.html, else 404.html with 404. */
function serveLikePages(): Promise<{ base: string; close: () => void }> {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]!)).replace(/^(\.\.[/\\])+/, "");
    const candidates = [join(DIST, path), join(DIST, path, "index.html"), join(DIST, `${path}.html`)];
    const file = candidates.find((c) => existsSync(c) && statSync(c).isFile());
    if (file) {
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      createReadStream(file).pipe(res);
      return;
    }
    res.writeHead(404, { "Content-Type": TYPES[".html"]! });
    res.end(existsSync(join(DIST, "404.html")) ? readFileSync(join(DIST, "404.html")) : "not found");
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() })));
}

async function routesFromSitemap(base: string): Promise<string[]> {
  const index = await (await fetch(`${base}/sitemap-index.xml`)).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  const routes: string[] = [];
  for (const map of maps) {
    const xml = await (await fetch(`${base}${map}`)).text();
    routes.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname));
  }
  return routes;
}

const target = process.argv[2];
const local = target ? null : await serveLikePages();
const base = (target ?? local!.base).replace(/\/$/, "");
const routes = [...new Set([...LEGACY_ROUTES, ...(await routesFromSitemap(base))])].sort();
const problems: string[] = [];

for (const route of routes) {
  const res = await fetch(`${base}${route}`, { redirect: "manual", headers: { "User-Agent": "udan-verify-static" } });
  const html = await res.text();
  const fail = (msg: string) => problems.push(`${route}: ${msg}`);
  if (res.status !== 200) {
    fail(`HTTP ${res.status}${res.headers.get("location") ? ` -> ${res.headers.get("location")}` : ""}`);
    continue;
  }
  if (!(res.headers.get("content-type") ?? "").includes("text/html")) fail(`content-type ${res.headers.get("content-type")}`);
  if (!title(html)) fail("no title");
  if (!h1Text(html)) fail("no h1 text in the HTML (would need JavaScript)");
  if (visibleText(html).length < 400) fail("very little text without JavaScript");
  if (!canonical(html)) fail("no canonical");
  const og = meta(html, "property", "og:image");
  if (!og) fail("no og:image");
  else if (target) {
    const img = await fetch(og, { method: "HEAD" });
    if (!img.ok || !(img.headers.get("content-type") ?? "").startsWith("image/")) fail(`og:image ${og} -> ${img.status} ${img.headers.get("content-type")}`);
  }
  console.log(`${res.status} ${route}  ${title(html)}`);
}

const missing = await fetch(`${base}/this-page-does-not-exist`);
if (missing.status !== 404) problems.push(`/this-page-does-not-exist returned ${missing.status}, expected 404`);

local?.close();
if (problems.length > 0) {
  console.error(`\nStatic verification failed against ${base}:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`\nAll ${routes.length} routes return 200 HTML with content readable without JavaScript (${base}).`);
