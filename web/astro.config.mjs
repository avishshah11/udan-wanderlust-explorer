// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// Static site, served by Cloudflare (web/wrangler.jsonc): one real HTML file per route (about.html is
// served at /about with a 200, no redirect), canonical URLs without a
// trailing slash.
export default defineConfig({
  site: "https://udantravelsbdq.com",
  trailingSlash: "never",
  build: { format: "file" },
  integrations: [react(), sitemap({ filter: (page) => !page.includes("/404") })],
});
