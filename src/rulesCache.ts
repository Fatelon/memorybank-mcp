import type { MemoryBankBackendClient } from './backendClient.js';
import type { MemoryBankConfig } from './config.js';

interface CachedRules {
  text: string;
  cachedAt: number;
}

export class RulesCache {
  private cache: CachedRules | null = null;

  constructor(
    private readonly backendClient: MemoryBankBackendClient,
    private readonly config: MemoryBankConfig
  ) {}

  async getRules(force = false): Promise<string> {
    const shouldUseCache = !force && this.isCacheValid();

    if (shouldUseCache && this.cache) {
      return this.cache.text;
    }

    const rulesText = await this.backendClient.fetchRules();

    this.cache = {
      text: rulesText,
      cachedAt: Date.now()
    };

    return this.cache.text;
  }

  private isCacheValid(): boolean {
    if (!this.cache) return false;
    if (this.config.cacheTtlMs === 0) return false;
    return Date.now() - this.cache.cachedAt < this.config.cacheTtlMs;
  }
}
