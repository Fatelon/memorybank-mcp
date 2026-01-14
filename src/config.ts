import { z } from 'zod';
import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);
const packageJson = nodeRequire('../package.json');

export const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_USER_AGENT = `memorybank-mcp/${packageJson.version ?? '0.0.0'}`;

const envSchema = z.object({
  MEMORYBANK_BASE_URL: z.string().url('MEMORYBANK_BASE_URL must be a valid URL'),
  MEMORYBANK_API_KEY: z.string().min(1, 'MEMORYBANK_API_KEY is required'),
  MEMORYBANK_PROJECT_ID: z.string().min(1).optional(),
  MEMORYBANK_TIMEOUT_MS: z.string().optional(),
  MEMORYBANK_USER_AGENT: z.string().optional()
});

export interface MemoryBankConfig {
  baseUrl: string;
  apiKey: string;
  projectId?: string;
  timeoutMs: number;
  userAgent: string;
  version: string;
}

const formatZodError = (error: z.ZodError) =>
  error.issues
    .map((issue: z.ZodIssue) =>
      issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message
    )
    .join('; ');

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): MemoryBankConfig => {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid MemoryBank MCP configuration: ${formatZodError(result.error)}`);
  }

  const timeoutEnv = result.data.MEMORYBANK_TIMEOUT_MS;
  const timeoutMs = timeoutEnv ? Number(timeoutEnv) : DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('MEMORYBANK_TIMEOUT_MS must be a positive number in milliseconds');
  }

  return {
    baseUrl: result.data.MEMORYBANK_BASE_URL.replace(/\/$/, ''),
    apiKey: result.data.MEMORYBANK_API_KEY,
    projectId: result.data.MEMORYBANK_PROJECT_ID,
    timeoutMs,
    userAgent: result.data.MEMORYBANK_USER_AGENT ?? DEFAULT_USER_AGENT,
    version: typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'
  };
};
