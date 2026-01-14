import { z } from 'zod';
import type { MemoryBankConfig } from './config.js';

const RULES_ENDPOINT_PATH = '/api/external/rules';

const RulesSuccessSchema = z.object({
  projectId: z.string(),
  mode: z.enum(['minimal', 'full', 'pack']),
  packs: z.array(z.string()).optional(),
  rulesMarkdown: z.string()
});

const ErrorSchema = z.object({
  error: z.string()
});
const SHOULD_LOG_DEBUG = process.env.DEBUG_MEMORYBANK_MCP === 'true';

export class MemoryBankBackendError extends Error {
  constructor(message: string, public readonly statusCode?: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MemoryBankBackendError';
  }
}

export class MemoryBankTimeoutError extends MemoryBankBackendError {
  constructor(timeoutMs: number) {
    super(`MemoryBank backend request timed out after ${timeoutMs}ms`);
    this.name = 'MemoryBankTimeoutError';
  }
}

export class MemoryBankBackendClient {
  constructor(private readonly config: MemoryBankConfig, private readonly fetchImpl: typeof fetch = fetch) {}

  async fetchRulesText(): Promise<string> {
    const url = new URL(RULES_ENDPOINT_PATH, this.config.baseUrl);
    if (this.config.projectId) {
      url.searchParams.set('projectId', this.config.projectId);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          Accept: 'application/json',
          'User-Agent': this.config.userAgent
        },
        signal: controller.signal
      });

      const payload = await this.parseJson(response);

      if (!response.ok) {
        const message = this.formatErrorResponse(payload);
        if (message) {
          throw new MemoryBankBackendError(message, response.status);
        }

        if (response.status === 401 || response.status === 403) {
          throw new MemoryBankBackendError(
            'Unable to authenticate with MemoryBank. Verify MEMORYBANK_API_KEY and optional MEMORYBANK_PROJECT_ID.',
            response.status
          );
        }

        throw new MemoryBankBackendError('Unexpected error while retrieving MemoryBank rules.', response.status);
      }

      const parsed = RulesSuccessSchema.safeParse(payload);
      if (!parsed.success) {
        throw new MemoryBankBackendError('Unexpected payload received from MemoryBank.');
      }

      return parsed.data.rulesMarkdown;
    } catch (error) {
      if (error instanceof MemoryBankBackendError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new MemoryBankTimeoutError(this.config.timeoutMs);
      }

      throw new MemoryBankBackendError('Unable to reach MemoryBank backend', undefined, {
        cause: error
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async parseJson(response: Response): Promise<unknown> {
    const raw = await response.text();
    try {
      return raw.length ? JSON.parse(raw) : {};
    } catch (error) {
      if (SHOULD_LOG_DEBUG) {
        console.error(
          'MemoryBank MCP failed to parse backend response as JSON:',
          JSON.stringify({
            status: response.status,
            contentType: response.headers.get('content-type'),
            bodyPreview: raw.slice(0, 500)
          })
        );
      }
      throw new MemoryBankBackendError('Failed to parse MemoryBank response as JSON.', response.status, {
        cause: error
      });
    }
  }

  private formatErrorResponse(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const parsed = ErrorSchema.safeParse(payload);
    if (!parsed.success) {
      return null;
    }

    const extras = { ...payload };
    delete (extras as Record<string, unknown>).error;

    const extraKeys = Object.keys(extras);
    if (!extraKeys.length) {
      return parsed.data.error;
    }

    return `${parsed.data.error} Details: ${JSON.stringify(extras)}`;
  }
}
