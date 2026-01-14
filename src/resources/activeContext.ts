import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MemoryBankBackendClient } from '../backendClient.js';

const RESOURCE_URI = 'memorybank://context/active_context';

export const registerActiveContextResource = (
  server: McpServer,
  backendClient: MemoryBankBackendClient
): void => {
  server.registerResource(
    'memorybank_active_context',
    RESOURCE_URI,
    {
      description: 'Latest MemoryBank rules for this workspace.',
      mimeType: 'text/markdown'
    },
    async () => {
      const rulesText = await backendClient.fetchRulesText();
      return {
        contents: [
          {
            uri: RESOURCE_URI,
            mimeType: 'text/markdown',
            text: rulesText.trim()
          }
        ]
      };
    }
  );
};
