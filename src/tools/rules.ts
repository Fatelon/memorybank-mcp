import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MemoryBankBackendError } from '../backendClient.js';
import type { RulesCache } from '../rulesCache.js';

const TOOL_NAMES = ['memorybank_get_rules'] as const;
const InputSchema = z
  .object({
    force: z.boolean().optional().describe('Bypass cache and fetch fresh rules from backend')
  })
  .describe('Optional parameters for fetching rules.');

const getUserFriendlyError = (error: unknown): string => {
  if (error instanceof MemoryBankBackendError) {
    return error.message;
  }
  return 'An unexpected error occurred while fetching MemoryBank rules.';
};

export const registerRulesTool = (server: McpServer, rulesCache: RulesCache): void => {
  for (const name of TOOL_NAMES) {
    server.registerTool(
      name,
      {
        description: 'Retrieve the complete MemoryBank rules document as Markdown text.',
        inputSchema: InputSchema
      },
      async (input: { force?: boolean }) => {
        try {
          const rulesText = await rulesCache.getRules(input.force);
          return {
            content: [
              {
                type: 'text',
                text: rulesText.trim()
              }
            ]
          };
        } catch (error) {
          const errorMessage = getUserFriendlyError(error);
          return {
            content: [
              {
                type: 'text',
                text: errorMessage
              }
            ],
            isError: true
          };
        }
      }
    );
  }
};
