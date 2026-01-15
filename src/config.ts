import { z } from 'zod';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const nodeRequire = createRequire(import.meta.url);
const packageJson = nodeRequire('../package.json');

export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_CACHE_TTL_MS = 600_000; // 10 minutes
const DEFAULT_USER_AGENT = `memorybank-mcp/${packageJson.version ?? '0.0.0'}`;

const envSchema = z.object({
  MEMORYBANK_BASE_URL: z.string().url('MEMORYBANK_BASE_URL must be a valid URL'),
  MEMORYBANK_API_KEY: z.string().min(1, 'MEMORYBANK_API_KEY is required'),
  MEMORYBANK_PROJECT_ID: z.string().min(1).optional(),
  MEMORYBANK_TIMEOUT_MS: z.string().optional(),
  MEMORYBANK_CACHE_TTL_MS: z.string().optional(),
  MEMORYBANK_USER_AGENT: z.string().optional()
});

export interface MemoryBankConfig {
  baseUrl: string;
  apiKey: string;
  projectId?: string;
  timeoutMs: number;
  cacheTtlMs: number;
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
  // Load .env file from current working directory with priority over process.env
  const envPath = resolve(process.cwd(), '.env');
  const dotenvResult = existsSync(envPath) ? dotenv.config({ path: envPath }) : { parsed: {} };

  // Merge with priority: .env file > process.env (MCP config)
  const mergedEnv = {
    ...env,
    ...(dotenvResult.parsed || {})
  };

  const result = envSchema.safeParse(mergedEnv);
  if (!result.success) {
    throw new Error(`Invalid MemoryBank MCP configuration: ${formatZodError(result.error)}`);
  }

  const timeoutEnv = result.data.MEMORYBANK_TIMEOUT_MS;
  const timeoutMs = timeoutEnv ? Number(timeoutEnv) : DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('MEMORYBANK_TIMEOUT_MS must be a positive number in milliseconds');
  }

  const cacheTtlEnv = result.data.MEMORYBANK_CACHE_TTL_MS;
  const cacheTtlMs = cacheTtlEnv ? Number(cacheTtlEnv) : DEFAULT_CACHE_TTL_MS;
  if (!Number.isFinite(cacheTtlMs) || cacheTtlMs < 0) {
    throw new Error('MEMORYBANK_CACHE_TTL_MS must be a non-negative number in milliseconds');
  }

  return {
    baseUrl: result.data.MEMORYBANK_BASE_URL.replace(/\/$/, ''),
    apiKey: result.data.MEMORYBANK_API_KEY,
    projectId: result.data.MEMORYBANK_PROJECT_ID,
    timeoutMs,
    cacheTtlMs,
    userAgent: result.data.MEMORYBANK_USER_AGENT ?? DEFAULT_USER_AGENT,
    version: typeof packageJson.version === 'string' ? packageJson.version : '0.0.0'
  };
};
