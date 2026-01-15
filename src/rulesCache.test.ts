import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RulesCache } from './rulesCache.js';
import { registerRulesTool } from './tools/rules.js';
import { registerActiveContextResource } from './resources/activeContext.js';
import { registerRulesResource } from './resources/rules.js';
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

describe('RulesCache', () => {
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

  it('fetches rules from backend on first call', async () => {
    fetchRulesMock.mockResolvedValue('# Test Rules');

    const cache = new RulesCache(mockBackendClient, mockConfig);
    const result = await cache.getRules();

    expect(result).toBe('# Test Rules');
    expect(fetchRulesMock).toHaveBeenCalledTimes(1);
  });

  it('returns cached rules on subsequent calls without hitting backend', async () => {
    fetchRulesMock.mockResolvedValue('# Test Rules');

    const cache = new RulesCache(mockBackendClient, mockConfig);

    await cache.getRules();
    const result2 = await cache.getRules();
    const result3 = await cache.getRules();

    expect(result2).toBe('# Test Rules');
    expect(result3).toBe('# Test Rules');
    expect(fetchRulesMock).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when force=true is set', async () => {
    fetchRulesMock.mockResolvedValueOnce('# Old Rules').mockResolvedValueOnce('# New Rules');

    const cache = new RulesCache(mockBackendClient, mockConfig);

    const result1 = await cache.getRules();
    expect(result1).toBe('# Old Rules');

    const result2 = await cache.getRules(true);
    expect(result2).toBe('# New Rules');

    expect(fetchRulesMock).toHaveBeenCalledTimes(2);
  });

  it('refetches when cache TTL expires', async () => {
    jest.useFakeTimers();
    fetchRulesMock.mockResolvedValueOnce('# Old Rules').mockResolvedValueOnce('# New Rules');

    const shortTtlConfig = { ...mockConfig, cacheTtlMs: 1000 };
    const cache = new RulesCache(mockBackendClient, shortTtlConfig);

    const result1 = await cache.getRules();
    expect(result1).toBe('# Old Rules');
    expect(fetchRulesMock).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(500);
    const result2 = await cache.getRules();
    expect(result2).toBe('# Old Rules');
    expect(fetchRulesMock).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(600);
    const result3 = await cache.getRules();
    expect(result3).toBe('# New Rules');
    expect(fetchRulesMock).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('disables caching when cacheTtlMs is 0', async () => {
    fetchRulesMock.mockResolvedValue('# Rules');

    const noCacheConfig = { ...mockConfig, cacheTtlMs: 0 };
    const cache = new RulesCache(mockBackendClient, noCacheConfig);

    await cache.getRules();
    await cache.getRules();
    await cache.getRules();

    expect(fetchRulesMock).toHaveBeenCalledTimes(3);
  });
});

describe('Shared cache integration', () => {
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

  it('tool and resources share the same cache instance', async () => {
    fetchRulesMock.mockResolvedValue('# Shared Rules');

    const cache = new RulesCache(mockBackendClient, mockConfig);
    const mockServer = createMockServer();

    registerRulesTool(mockServer, cache);
    registerActiveContextResource(mockServer, cache);
    registerRulesResource(mockServer, cache);

    const toolHandler = mockServer.registerTool.mock.calls[0][2];
    await toolHandler({ force: false });

    expect(fetchRulesMock).toHaveBeenCalledTimes(1);

    const activeContextHandler = mockServer.registerResource.mock.calls[0][3];
    await activeContextHandler();

    expect(fetchRulesMock).toHaveBeenCalledTimes(1);

    const rulesResourceHandler = mockServer.registerResource.mock.calls[1][3];
    await rulesResourceHandler();

    expect(fetchRulesMock).toHaveBeenCalledTimes(1);
  });

  it('tool with force=true refreshes cache for all consumers', async () => {
    fetchRulesMock.mockResolvedValueOnce('# Old Rules').mockResolvedValueOnce('# New Rules');

    const cache = new RulesCache(mockBackendClient, mockConfig);
    const mockServer = createMockServer();

    registerRulesTool(mockServer, cache);
    registerRulesResource(mockServer, cache);

    const toolHandler = mockServer.registerTool.mock.calls[0][2];
    const resourceHandler = mockServer.registerResource.mock.calls[0][3];

    const result1 = await toolHandler({ force: false });
    expect(result1.content[0].text).toBe('# Old Rules');
    expect(fetchRulesMock).toHaveBeenCalledTimes(1);

    const result2 = await toolHandler({ force: true });
    expect(result2.content[0].text).toBe('# New Rules');
    expect(fetchRulesMock).toHaveBeenCalledTimes(2);

    const result3 = await resourceHandler();
    expect(result3.contents[0].text).toBe('# New Rules');
    expect(fetchRulesMock).toHaveBeenCalledTimes(2);
  });
});
