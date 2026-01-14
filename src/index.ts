import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { createMemoryBankServer } from './server.js';

const main = async (): Promise<void> => {
  const config = loadConfig();
  const server = createMemoryBankServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MemoryBank MCP server is running over stdio. Waiting for MCP client connections...');
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`MemoryBank MCP server failed to start: ${message}`);
  process.exitCode = 1;
});
