import { describe, expect, it } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/env";

// HTTP behaviour of the Worker that needs no database: discovery metadata,
// the OAuth challenge, and listing tools without signing in.
const env: Env = {
  SUPABASE_URL: "http://127.0.0.1:9", // unreachable on purpose
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  MCP_URL: "https://mcp.udantravelsbdq.com/mcp",
  APP_URL: "https://app.udantravelsbdq.com",
  DOCS_URL: "https://udantravelsbdq.com/connector",
  EMAIL_FROM: "Udan <quotes@udantravelsbdq.com>",
};
const exec = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;

const rpc = (body: unknown, headers: Record<string, string> = {}) =>
  worker.fetch(
    new Request("https://mcp.udantravelsbdq.com/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
      body: JSON.stringify(body),
    }),
    env,
    exec,
  );

const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } };

describe("MCP worker", () => {
  it("publishes protected-resource metadata pointing at Supabase Auth", async () => {
    const res = await worker.fetch(new Request("https://mcp.udantravelsbdq.com/.well-known/oauth-protected-resource"), env, exec);
    expect(await res.json()).toEqual({
      resource: "https://mcp.udantravelsbdq.com/mcp",
      authorization_servers: ["http://127.0.0.1:9/auth/v1"],
      bearer_methods_supported: ["header"],
      resource_name: "Udan Tours and Travels",
      resource_documentation: "https://udantravelsbdq.com/connector",
    });
  });

  it("initializes and lists the five tools without sign-in", async () => {
    const initRes = await rpc(init);
    expect(initRes.status).toBe(200);
    expect(((await initRes.json()) as { result: { serverInfo: { name: string } } }).result.serverInfo.name).toBe("udan-tours-and-travels");

    const list = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const tools = ((await list.json()) as { result: { tools: { name: string; title: string; annotations: Record<string, unknown>; inputSchema: unknown; outputSchema: unknown }[] } }).result.tools;
    expect(tools.map((t) => t.name).sort()).toEqual(["compare_price", "confirm_booking", "get_indicative_price", "get_quote", "request_quote"]);
    for (const t of tools) {
      expect(t.title).toBeTruthy();
      expect(t.annotations).toHaveProperty("readOnlyHint");
      expect(t.inputSchema).toBeTruthy();
      expect(t.outputSchema).toBeTruthy();
    }
  });

  it("answers a protected tool call without a token with 401 and a WWW-Authenticate challenge", async () => {
    const res = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_quote", arguments: { reference: "UDN-2611-K7QMX" } } });
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toBe('Bearer realm="udan", resource_metadata="https://mcp.udantravelsbdq.com/.well-known/oauth-protected-resource"');
    expect(((await res.json()) as { error: { message: string } }).error.message).toContain("needs a Udan sign-in");
  });

  it("rejects a bad token with invalid_token", async () => {
    const res = await rpc(init, { Authorization: "Bearer not-a-jwt" });
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toContain('error="invalid_token"');
  });

  it("can require sign-in for everything", async () => {
    const res = await worker.fetch(
      new Request("https://mcp.udantravelsbdq.com/mcp", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify(init) }),
      { ...env, AUTH_MODE: "all" },
      exec,
    );
    expect(res.status).toBe(401);
  });

  it("explains GET on a stateless server and bad JSON", async () => {
    expect((await worker.fetch(new Request("https://mcp.udantravelsbdq.com/mcp"), env, exec)).status).toBe(405);
    const bad = await worker.fetch(new Request("https://mcp.udantravelsbdq.com/mcp", { method: "POST", body: "{" }), env, exec);
    expect(bad.status).toBe(400);
  });
});
