// Builds the Next.js app as a Cloudflare Worker (OpenNext). No incremental
// cache is configured: every page reads live data per request.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
