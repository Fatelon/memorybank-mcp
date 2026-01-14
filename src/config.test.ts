import { describe, it, expect } from '@jest/globals';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('loads valid configuration with defaults when project ID is omitted', () => {
    const config = loadConfig({
      MEMORYBANK_BASE_URL: 'https://api.memorybank.example',
      MEMORYBANK_API_KEY: 'test-key'
    });

    expect(config.baseUrl).toBe('https://api.memorybank.example');
    expect(config.apiKey).toBe('test-key');
    expect(config.projectId).toBeUndefined();
    expect(config.timeoutMs).toBe(15000);
    expect(config.userAgent).toMatch(/^memorybank-mcp\//);
  });

  it('allows project ID and optional overrides', () => {
    const config = loadConfig({
      MEMORYBANK_BASE_URL: 'https://api.memorybank.example',
      MEMORYBANK_API_KEY: 'test-key',
      MEMORYBANK_PROJECT_ID: 'proj-123',
      MEMORYBANK_TIMEOUT_MS: '1000',
      MEMORYBANK_USER_AGENT: 'custom-agent'
    });

    expect(config.projectId).toBe('proj-123');
    expect(config.timeoutMs).toBe(1000);
    expect(config.userAgent).toBe('custom-agent');
  });

  it('validates required environment variables', () => {
    expect(() =>
      loadConfig({
        MEMORYBANK_BASE_URL: 'https://api.memorybank.example'
      })
    ).toThrow(/MEMORYBANK_API_KEY/);

    expect(() =>
      loadConfig({
        MEMORYBANK_BASE_URL: 'not-a-url',
        MEMORYBANK_API_KEY: 'test',
        MEMORYBANK_PROJECT_ID: 'proj-123'
      })
    ).toThrow(/MEMORYBANK_BASE_URL must be a valid URL/);
  });
});
