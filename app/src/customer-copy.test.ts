import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { findTurnaroundLanguage } from "@udan/core";
import { describe, expect, it } from "vitest";

// Rule 1: no turnaround time on any customer-facing surface. Scan the source
// of every page a customer can reach (the desk is staff-only and exempt).
const CUSTOMER_DIRS = ["src/app/account", "src/app/auth", "src/app/login", "src/app/quote", "src/app/api/quote-requests", "src/components"];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(tsx?|ts)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("customer-facing pages", () => {
  const all = CUSTOMER_DIRS.flatMap(files);
  it("exist", () => expect(all.length).toBeGreaterThan(10));
  it.each(all)("%s has no turnaround language", (path) => {
    expect(findTurnaroundLanguage(readFileSync(path, "utf8"))).toEqual([]);
  });
});
