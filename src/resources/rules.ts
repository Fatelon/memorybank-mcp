import { McpError } from '@modelcontextprotocol/sdk/types.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MemoryBankBackendError } from '../backendClient.js';
import type { RulesCache } from '../rulesCache.js';

const RESOURCE_URI = 'memorybank://rules';

export const registerRulesResource = (server: McpServer, rulesCache: RulesCache): void => {
  server.registerResource(
    'memorybank_rules',
    RESOURCE_URI,
    {
      description: 'MemoryBank rules document for this project.',
      mimeType: 'text/markdown'
    },
    async () => {
      try {
        const rulesText = await rulesCache.getRules();

        return {
          contents: [
            {
              uri: RESOURCE_URI,
              mimeType: 'text/markdown',
              text: rulesText.trim()
            }
          ]
        };
      } catch (error) {
        const message =
          error instanceof MemoryBankBackendError
            ? error.message
            : 'An unexpected error occurred while fetching MemoryBank rules.';
        throw new McpError(-32603, message);
      }
    }
  );
};
