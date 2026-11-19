import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { HANDLERS, TOOL_DEFINITIONS, type ToolContext, type ToolName, toolError } from "./tools";

export const SERVER_INFO = { name: "udan-tours-and-travels", version: "1.0.0" } as const;

/** A fresh server per request (stateless Streamable HTTP on Workers). */
export function buildServer(ctx: ToolContext): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions: undefined,
    capabilities: { tools: {} },
  });
  for (const name of Object.keys(TOOL_DEFINITIONS) as ToolName[]) {
    const def = TOOL_DEFINITIONS[name];
    const handler = HANDLERS[name] as (ctx: ToolContext, args: never) => ReturnType<(typeof HANDLERS)[ToolName]>;
    server.registerTool(
      name,
      { title: def.title, description: def.description, inputSchema: def.inputSchema, outputSchema: def.outputSchema, annotations: def.annotations },
      async (args: unknown) => {
        try {
          return await handler(ctx, args as never);
        } catch (err) {
          console.error(`tool ${name} failed`, err);
          return toolError("Udan's system could not complete this just now. Please try again; if it keeps failing, call Udan on +91 93762 14442.");
        }
      },
    );
  }
  return server;
}
