#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is reserved for MCP JSON-RPC traffic, so log to stderr only.
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.stack ?? err.message : String(err);
  console.error(`Fatal error in ${SERVER_NAME}:`, msg);
  process.exit(1);
});
