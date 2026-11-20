// Refuses to deploy an app bundle that carries anything but public values.
//
// OpenNext bakes the .env files it finds (repo root and app/: .env,
// .env.local, .env.production...) into .open-next/cloudflare/next-env.mjs,
// which is uploaded with the Worker. Secrets belong in Worker secrets
// (`wrangler secret put`), and a production bundle must not point at this
// computer. `cf:deploy` runs this first; scripts/deploy.mjs builds cleanly.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../.open-next", import.meta.url));
const ENV_FILE = join(OUT, "cloudflare", "next-env.mjs");
const LOCAL = /localhost|127\.0\.0\.1/;

if (!existsSync(ENV_FILE)) {
  console.error("check-worker-env: no app build found; run cf:build first");
  process.exit(1);
}

const problems = [];
const env = await import(`file://${ENV_FILE}`);
for (const mode of ["production", "development", "test"]) {
  for (const [name, value] of Object.entries(env[mode] ?? {})) {
    if (!name.startsWith("NEXT_PUBLIC_")) problems.push(`${name} (${mode}) is not a public value`);
    else if (LOCAL.test(String(value))) problems.push(`${name} (${mode}) points at this computer`);
  }
}

// Values built into the server code: the local Supabase stack must not appear.
function scan(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) scan(path);
    else if (/\.(m?js|json)$/.test(name) && readFileSync(path, "utf8").includes("127.0.0.1:54321")) {
      problems.push(`${path.slice(OUT.length + 1)} uses the local Supabase stack`);
    }
  }
}
scan(join(OUT, "server-functions"));

if (problems.length > 0) {
  console.error(`check-worker-env: not deploying; the app bundle would carry:\n  ${[...new Set(problems)].join("\n  ")}`);
  console.error("Build it with `node scripts/deploy.mjs app` (README, \"Deploying\").");
  process.exit(1);
}
console.log("check-worker-env: the app bundle carries only public values");
