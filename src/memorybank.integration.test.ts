import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RulesCache } from './rulesCache.js';
import { registerRulesTool } from './tools/rules.js';
import { registerActiveContextResource } from './resources/activeContext.js';
import type { MemoryBankBackendClient } from './backendClient.js';
import type { MemoryBankConfig } from './config.js';

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
  type FetchRules = () => Promise<string>;
  const fetchRulesMock: jest.MockedFunction<FetchRules> = jest.fn();
  const mockBackendClient = {
    fetchRules: fetchRulesMock
  } as unknown as MemoryBankBackendClient;

  const mockConfig: MemoryBankConfig = {
    baseUrl: 'https://api.example.com',
    apiKey: 'test-key',
    projectId: 'test-project',
    timeoutMs: 15000,
    cacheTtlMs: 300000,
    userAgent: 'test-agent',
    version: '1.0.0'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchRulesMock.mockReset();
  });

  it('exposes memorybank_get_rules tool that returns Markdown', async () => {
    const mockServer = createMockServer();
    fetchRulesMock.mockResolvedValue('# Rules\n- Item');

    const cache = new RulesCache(mockBackendClient, mockConfig);
    registerRulesTool(mockServer, cache);

    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    const [toolName, , handler] = mockServer.registerTool.mock.calls[0];

    expect(toolName).toBe('memorybank_get_rules');

    const result = await handler({ force: false });
    expect(result.content).toEqual([
      {
        type: 'text',
        text: '# Rules\n- Item'
      }
    ]);
  });

  it('exposes memorybank://context/active_context resource with same content', async () => {
    const mockServer = createMockServer();
    fetchRulesMock.mockResolvedValue('MemoryBank body');

    const cache = new RulesCache(mockBackendClient, mockConfig);
    registerActiveContextResource(mockServer, cache);

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
