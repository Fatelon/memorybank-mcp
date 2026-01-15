import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MemoryBankConfig } from './config.js';
import { MemoryBankBackendClient } from './backendClient.js';
import { RulesCache } from './rulesCache.js';
import { registerRulesTool } from './tools/rules.js';
import { registerActiveContextResource } from './resources/activeContext.js';
import { registerRulesResource } from './resources/rules.js';

const SERVER_INSTRUCTIONS =
  'At the start of each new chat/session, call memorybank_get_rules exactly once before any planning or code. Cache the result for the current session; do not call again unless a refresh is needed.';

export const createMemoryBankServer = (config: MemoryBankConfig): McpServer => {
  const server = new McpServer(
    {
      name: 'memorybank-mcp',
      version: config.version
    },
    { instructions: SERVER_INSTRUCTIONS }
  );

  const backendClient = new MemoryBankBackendClient(config);
  const rulesCache = new RulesCache(backendClient, config);

  registerRulesTool(server, rulesCache);
  registerActiveContextResource(server, rulesCache);
  registerRulesResource(server, rulesCache);

  return server;
};
