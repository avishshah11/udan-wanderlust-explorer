#!/usr/bin/env node
// Deploys one Cloudflare Worker from this Mac (README, "Deploying"):
//
//   node scripts/deploy.mjs connector
//   node scripts/deploy.mjs app
//   node scripts/deploy.mjs website
//   node scripts/deploy.mjs auth       (hosted Supabase sign-in settings)
//
// Values come from the git-ignored .env.cloudflare and are never printed.
// Each tool gets only the values it needs. The app is built with the .env
// files of this repo moved aside (OpenNext would bake them into the bundle),
// its bundle is checked before upload, and its secrets go to Cloudflare as
// Worker secrets. Empty values are skipped, so a secret can be added later by
// filling it in and deploying again.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP_URL = "https://app.udantravelsbdq.com";
const SITE_URL = "https://udantravelsbdq.com";
const TARGETS = ["connector", "app", "website", "auth"];

class DeployError extends Error {}
const fail = (message) => {
  throw new DeployError(message);
};

function readValues() {
  const file = join(ROOT, ".env.cloudflare");
  if (!existsSync(file)) fail(".env.cloudflare not found (README, \"Deploying\")");
  return parseEnv(readFileSync(file, "utf8"));
}

function main(target, values) {
  const need = (name) => values[name] || fail(`${name} is empty in .env.cloudflare`);
  // Child processes never inherit this shell's environment beyond the basics.
  const base = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG ?? "en_US.UTF-8", TERM: process.env.TERM ?? "dumb" };
  const cloudflare = { CLOUDFLARE_API_TOKEN: need("CLOUDFLARE_API_TOKEN"), CLOUDFLARE_ACCOUNT_ID: need("CLOUDFLARE_ACCOUNT_ID") };
  const supabaseUrl = need("PUBLIC_SUPABASE_URL");
  const publishableKey = need("PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  const pnpm = (args, { cwd = ROOT, env = {}, input } = {}) => {
    const result = spawnSync("pnpm", args, {
      cwd,
      env: { ...base, ...env },
      input,
      stdio: [input === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    });
    if (result.status !== 0) fail(`pnpm ${args.slice(0, 4).join(" ")} failed`);
  };

  const putSecrets = (dir, names) => {
    for (const name of names) {
      if (!values[name]) {
        console.log(`secret ${name}: skipped (empty in .env.cloudflare)`);
        continue;
      }
      pnpm(["exec", "wrangler", "secret", "put", name], { cwd: join(ROOT, dir), env: cloudflare, input: values[name] });
    }
  };

  // Renames files that build tools read by name, runs fn, and always puts them back.
  const withoutFiles = (paths, fn) => {
    const hidden = paths.filter((p) => existsSync(join(ROOT, p)));
    for (const p of hidden) renameSync(join(ROOT, p), join(ROOT, `${p}.hidden-by-deploy`));
    try {
      fn();
    } finally {
      for (const p of hidden) renameSync(join(ROOT, `${p}.hidden-by-deploy`), join(ROOT, p));
    }
  };

  if (target === "connector") {
    pnpm(
      ["--filter", "@udan/mcp", "exec", "wrangler", "deploy", "--var", `SUPABASE_URL:${supabaseUrl}`, "--var", `SUPABASE_PUBLISHABLE_KEY:${publishableKey}`],
      { env: cloudflare },
    );
    putSecrets("mcp", ["RESEND_API_KEY", "STAFF_ALERT_EMAIL"]);
  }

  if (target === "app") {
    const envFiles = [".env", ".env.local", ".env.production", ".env.production.local"];
    // .dev.vars too: OpenNext's deploy step reads it (local testing values).
    withoutFiles([...envFiles, ...envFiles.map((f) => `app/${f}`), "app/.dev.vars"], () => {
      pnpm(["--filter", "@udan/app", "run", "cf:build"], {
        env: {
          NEXT_PUBLIC_APP_URL: APP_URL,
          NEXT_PUBLIC_SITE_URL: SITE_URL,
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
        },
      });
      // cf:deploy checks the bundle first and refuses to upload anything else.
      pnpm(["--filter", "@udan/app", "run", "cf:deploy"], { env: cloudflare });
    });
    putSecrets("app", ["SUPABASE_SECRET_KEY", "RESEND_API_KEY", "EMAIL_REPLY_TO", "STAFF_ALERT_EMAIL", "PAYMENT_DETAILS_BANK", "PAYMENT_DETAILS_UPI"]);
  }

  if (target === "website") {
    pnpm(["--filter", "@udan/web", "build"], {
      env: { PUBLIC_APP_URL: APP_URL, PUBLIC_SUPABASE_URL: supabaseUrl, PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey },
    });
    pnpm(["--filter", "@udan/web", "verify"]);
    pnpm(["--filter", "@udan/web", "exec", "wrangler", "deploy"], { env: cloudflare });
  }

  if (target === "auth") {
    // The [remotes.production] block of supabase/config.toml. Its SMTP
    // password is the Resend API key; a push without it would blank it, so
    // hosted settings are pushed only from here.
    pnpm(["--filter", "@udan/supabase", "exec", "supabase", "config", "push", "--yes", "--workdir", ".."], {
      env: { RESEND_API_KEY: need("RESEND_API_KEY") },
    });
  }

  console.log(`deploy: ${target} done`);
}

const target = process.argv[2];
try {
  if (!TARGETS.includes(target)) fail(`usage: node scripts/deploy.mjs ${TARGETS.join("|")}`);
  main(target, readValues());
} catch (error) {
  if (!(error instanceof DeployError)) throw error;
  console.error(`deploy: ${error.message}`);
  process.exitCode = 1;
}
