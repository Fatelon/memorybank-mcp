import path from 'node:path';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const TOOL_NAME = 'memorybank_get_rules';

const extractTextContent = (result: unknown): string | null => {
  if (!result || typeof result !== 'object') {
    return null;
  }
  const content = (result as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return null;
  }

  const texts: string[] = [];
  for (const entry of content) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry as { type?: unknown }).type === 'text' &&
      typeof (entry as { text?: unknown }).text === 'string'
    ) {
      texts.push((entry as { text: string }).text);
    }
  }

  return texts.length ? texts.join('\n') : null;
};

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable ${key}`);
  }
  return value;
};

const buildChildEnv = (): Record<string, string> => {
  const requiredEnv: Record<string, string> = {
    MEMORYBANK_BASE_URL: requireEnv('MEMORYBANK_BASE_URL'),
    MEMORYBANK_API_KEY: requireEnv('MEMORYBANK_API_KEY')
  };

  if (process.env.MEMORYBANK_PROJECT_ID) {
    requiredEnv.MEMORYBANK_PROJECT_ID = process.env.MEMORYBANK_PROJECT_ID;
  }

  if (process.env.MEMORYBANK_TIMEOUT_MS) {
    requiredEnv.MEMORYBANK_TIMEOUT_MS = process.env.MEMORYBANK_TIMEOUT_MS;
  }

  if (process.env.MEMORYBANK_USER_AGENT) {
    requiredEnv.MEMORYBANK_USER_AGENT = process.env.MEMORYBANK_USER_AGENT;
  }

  return requiredEnv;
};

const sanitizeProcessEnv = (): Record<string, string> => {
  const cleanEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      cleanEnv[key] = value;
    }
  }
  return cleanEnv;
};

const run = async (): Promise<void> => {
  const extraArgs = process.argv.slice(2);
  if (extraArgs.length > 0 && extraArgs[0] !== 'rules') {
    throw new Error('This debug client only supports the optional "rules" argument.');
  }

  const client = new Client({
    name: 'memorybank-debug-client',
    version: '0.0.0'
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(process.cwd(), 'dist/index.js')],
    env: {
      ...sanitizeProcessEnv(),
      ...buildChildEnv()
    }
  });

  await client.connect(transport);
  console.info('Connected to MemoryBank MCP server.');

  const result = await client.callTool({
    name: TOOL_NAME,
    arguments: {}
  });

  console.log('===============================================');
  const textContent = extractTextContent(result);
  if (textContent) {
    console.log(textContent);
  } else {
    console.dir(result, { depth: null, colors: true });
  }
  console.log('===============================================');

  await client.close();
};

run().catch((error) => {
  console.error('Debug client failed:', error);
  process.exitCode = 1;
});
