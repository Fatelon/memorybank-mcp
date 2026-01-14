import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MemoryBankConfig } from './config.js';
import { MemoryBankBackendClient } from './backendClient.js';
import { registerRulesTool } from './tools/rules.js';
import { registerActiveContextResource } from './resources/activeContext.js';

const SERVER_INSTRUCTIONS =
  'This MCP server exposes the user’s MemoryBank rules. Call memorybank_get_rules once before starting work so the full rule set is in context.';

export const createMemoryBankServer = (config: MemoryBankConfig): McpServer => {
  const server = new McpServer(
    {
      name: 'memorybank-mcp',
      version: config.version
    },
    { instructions: SERVER_INSTRUCTIONS }
  );

  const backendClient = new MemoryBankBackendClient(config);
  registerRulesTool(server, backendClient);
  registerActiveContextResource(server, backendClient);

  return server;
};
