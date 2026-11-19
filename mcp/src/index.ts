// Udan Tours and Travels remote MCP server (Cloudflare Workers, stateless
// Streamable HTTP at /mcp).
//
// Auth: Supabase Auth is the OAuth 2.1 authorization server (dynamic client
// registration + PKCE; sign-in and consent on app.udantravelsbdq.com). This
// Worker is the protected resource: it publishes RFC 9728 metadata, checks
// the bearer token with Supabase, and calls the database as that user so row
// level security applies. get_indicative_price and compare_price work without
// a token; calling any other tool without one returns HTTP 401 with a
// WWW-Authenticate challenge, which starts the client's OAuth flow.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { anonClient, publicData, userData } from "./db";
import type { Env } from "./env";
import { notifier } from "./notify";
import { buildServer, SERVER_INFO } from "./server";
import { SIGN_IN_REQUIRED, type SignedInUser, type ToolContext } from "./tools";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS, ...headers } });
}

function resourceMetadataUrl(env: Env): string {
  return `${new URL(env.MCP_URL).origin}/.well-known/oauth-protected-resource`;
}

export function protectedResourceMetadata(env: Env) {
  return {
    resource: env.MCP_URL,
    authorization_servers: [`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Udan Tours and Travels",
    resource_documentation: env.DOCS_URL,
  };
}

function unauthorized(env: Env, id: unknown, error?: "invalid_token"): Response {
  const challenge = [`Bearer realm="udan"`, `resource_metadata="${resourceMetadataUrl(env)}"`];
  if (error) challenge.push(`error="${error}"`, `error_description="The Udan sign-in has expired or is not valid. Sign in again."`);
  return json(
    {
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code: -32001,
        message:
          error === "invalid_token"
            ? "The Udan sign-in has expired or is not valid. Reconnect the Udan Tours and Travels connector to sign in again."
            : "This needs a Udan sign-in. Connect the Udan Tours and Travels connector with your Udan account (email link or Google).",
      },
    },
    401,
    { "WWW-Authenticate": challenge.join(", ") },
  );
}

interface JsonRpcMessage {
  id?: unknown;
  method?: string;
  params?: { name?: string };
}

function needsSignIn(env: Env, messages: JsonRpcMessage[]): boolean {
  if (env.AUTH_MODE === "all") return true;
  return messages.some((m) => m?.method === "tools/call" && SIGN_IN_REQUIRED.has(m.params?.name ?? ""));
}

async function verify(env: Env, token: string): Promise<{ id: string; email: string; clientId: string } | null> {
  const { data, error } = await anonClient(env).auth.getClaims(token);
  const claims = data?.claims as { sub?: string; email?: string; role?: string; client_id?: string } | undefined;
  if (error || !claims?.sub || claims.role !== "authenticated" || !claims.email) return null;
  return { id: claims.sub, email: claims.email, clientId: claims.client_id ?? "supabase-session" };
}

let asMetadataCache: { body: string; at: number } | null = null;

export default {
  async fetch(request: Request, env: Env, execution: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/.well-known/oauth-protected-resource" || url.pathname === "/.well-known/oauth-protected-resource/mcp") {
      return json(protectedResourceMetadata(env), 200, { "Cache-Control": "public, max-age=3600" });
    }

    // For clients that look for authorization-server metadata on this origin.
    if (url.pathname === "/.well-known/oauth-authorization-server" || url.pathname === "/.well-known/oauth-authorization-server/mcp") {
      if (!asMetadataCache || Date.now() - asMetadataCache.at > 3600_000) {
        const base = env.SUPABASE_URL.replace(/\/$/, "");
        let res = await fetch(`${base}/auth/v1/.well-known/oauth-authorization-server`);
        if (!res.ok) res = await fetch(`${base}/.well-known/oauth-authorization-server/auth/v1`);
        if (!res.ok) return json({ error: "authorization server metadata unavailable" }, 502);
        asMetadataCache = { body: await res.text(), at: Date.now() };
      }
      return new Response(asMetadataCache.body, { headers: { "Content-Type": "application/json", ...CORS } });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return json({ ...SERVER_INFO, mcp_endpoint: env.MCP_URL, documentation: env.DOCS_URL });
    }

    if (url.pathname !== "/mcp") return json({ error: "Not found. The MCP endpoint is /mcp." }, 404);
    if (request.method !== "POST") {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "This server is stateless: send JSON-RPC requests with POST /mcp." } }, 405, { Allow: "POST, OPTIONS" });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "The request body is not valid JSON." } }, 400);
    }
    const messages = (Array.isArray(body) ? body : [body]) as JsonRpcMessage[];

    const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") ?? "")?.[1]?.trim();
    let user: SignedInUser | null = null;
    let authInfo: AuthInfo | undefined;
    if (token) {
      const verified = await verify(env, token);
      if (!verified) return unauthorized(env, messages[0]?.id, "invalid_token");
      user = { id: verified.id, email: verified.email, data: userData(env, token) };
      authInfo = { token, clientId: verified.clientId, scopes: [], extra: { userId: verified.id, email: verified.email } };
    } else if (needsSignIn(env, messages)) {
      return unauthorized(env, messages[0]?.id);
    }

    const pub = publicData(env);
    const ctx: ToolContext = {
      publicData: pub,
      user,
      appUrl: env.APP_URL.replace(/\/$/, ""),
      background: (task) => execution.waitUntil(task.catch((err) => console.error("background task failed", err))),
      notify: notifier(env, () => pub.rates()),
    };

    const server = buildServer(ctx);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    const response = await transport.handleRequest(request, { parsedBody: body, authInfo });
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;
