export interface Env {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  /** Public URL of this server's MCP endpoint, e.g. https://mcp.udantravelsbdq.com/mcp */
  MCP_URL: string;
  APP_URL: string;
  DOCS_URL: string;
  EMAIL_FROM: string;
  /** Comma-separated desk addresses for new-request and accepted alerts. */
  STAFF_ALERT_EMAIL?: string;
  RESEND_API_KEY?: string;
  /**
   * "protected_tools" (default): no sign-in for the two read-only price tools;
   * the other three answer HTTP 401 to start OAuth. "all": every request
   * needs a token, for clients that only start OAuth on connect.
   */
  AUTH_MODE?: "protected_tools" | "all";
}
