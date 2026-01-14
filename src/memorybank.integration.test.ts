import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerRulesTool } from './tools/rules.js';
import { registerActiveContextResource } from './resources/activeContext.js';
import type { MemoryBankBackendClient } from './backendClient.js';

const createMockServer = () => {
  const registerTool = jest.fn();
  const registerResource = jest.fn();

  return {
    registerTool,
    registerResource
  } as unknown as McpServer & {
    registerTool: ReturnType<typeof jest.fn>;
    registerResource: ReturnType<typeof jest.fn>;
  };
};

describe('MemoryBank MCP surface area', () => {
  type FetchRulesText = () => Promise<string>;
  const fetchRulesTextMock: jest.MockedFunction<FetchRulesText> = jest.fn();
  const backendClient = {
    fetchRulesText: fetchRulesTextMock
  } as unknown as MemoryBankBackendClient;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchRulesTextMock.mockReset();
  });

  it('exposes memorybank_get_rules tool that returns Markdown', async () => {
    const mockServer = createMockServer();
    fetchRulesTextMock.mockResolvedValue('# Rules\n- Item');

    registerRulesTool(mockServer, backendClient);

    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    const [toolName, , handler] = mockServer.registerTool.mock.calls[0];

    expect(toolName).toBe('memorybank_get_rules');

    const result = await handler();
    expect(result.content).toEqual([
      {
        type: 'text',
        text: '# Rules\n- Item'
      }
    ]);
  });

  it('exposes memorybank://context/active_context resource with same content', async () => {
    const mockServer = createMockServer();
    fetchRulesTextMock.mockResolvedValue('MemoryBank body');

    registerActiveContextResource(mockServer, backendClient);

    expect(mockServer.registerResource).toHaveBeenCalledTimes(1);
    const [resourceName, uri, metadata, readHandler] = mockServer.registerResource.mock.calls[0];

    expect(resourceName).toBe('memorybank_active_context');
    expect(uri).toBe('memorybank://context/active_context');
    expect(metadata).toMatchObject({
      mimeType: 'text/markdown'
    });

    const readResult = await readHandler();
    expect(readResult.contents).toEqual([
      {
        uri: 'memorybank://context/active_context',
        mimeType: 'text/markdown',
        text: 'MemoryBank body'
      }
    ]);
  });
});
