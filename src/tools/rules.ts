import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MemoryBankBackendClient } from '../backendClient.js';

const TOOL_NAMES = ['memorybank_get_rules'] as const;
const EmptyInputSchema = z.object({}).describe('No parameters are required.');

export const registerRulesTool = (server: McpServer, backendClient: MemoryBankBackendClient): void => {
  for (const name of TOOL_NAMES) {
    server.registerTool(
      name,
      {
        description: 'Retrieve the complete MemoryBank rules document as Markdown text.',
        inputSchema: EmptyInputSchema
      },
      async () => {
        try {
          const rulesText = await backendClient.fetchRulesText();
          return {
            content: [
              {
                type: 'text',
                text: rulesText.trim()
              }
            ]
          };
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Unknown error while contacting the MemoryBank backend.');
        }
      }
    );
  }
};
