# memorybank-mcp

MemoryBank MCP server for Cursor clients. It proxies the MemoryBank rules endpoint (`GET /api/external/rules`) over MCP stdio via the `memorybank_get_rules` tool and returns the complete rules document as plain text.

## Requirements
- Node.js 18+
- `MEMORYBANK_BASE_URL` and `MEMORYBANK_API_KEY` environment variables must be set before start. `MEMORYBANK_PROJECT_ID` is optional but recommended when your API key is scoped to a project.

## Environment variables
During development you can store secrets in a local `.env` file and run the provided npm scripts (`npm run dev`, `npm run debug`) – they already pass `--env-file=.env` to `tsx`. For production runs (`node dist/index.js` or the published binary) export the variables in your shell.

| Name | Required | Description |
| --- | --- | --- |
| `MEMORYBANK_BASE_URL` | yes | MemoryBank backend origin, e.g. `https://example.com`. The server will call `${BASE_URL}/api/external/rules`. |
| `MEMORYBANK_API_KEY` | yes | Workspace API key used for the Authorization header. |
| `MEMORYBANK_PROJECT_ID` | no | Project/workspace identifier passed as the `projectId` query parameter. Provide it when the API key is scoped to a project. |
| `MEMORYBANK_TIMEOUT_MS` | no | Override request timeout in milliseconds (default `15000`). |
| `MEMORYBANK_USER_AGENT` | no | Custom User-Agent header (defaults to `memorybank-mcp/<package version>`). |

## Scripts
- `npm run build` – compile TypeScript into `dist/`.
- `npm start` – run the compiled stdio server (`node dist/index.js`).
- `npm run dev` – launch the stdio server in watch mode via `tsx`, loading variables from `.env`.
- `npm run watch` – run the TypeScript compiler in watch mode (`tsc -w`) to keep `dist/` updated without launching the server.
- `npm run debug` – start the debug client to call the `memorybank_get_rules` tool via stdio.

## Resources
- `memorybank://context/active_context` – exposes the current MemoryBank ruleset as Markdown (identical to the `memorybank_get_rules` tool output). MCP clients that prefer reading resources can fetch this URI directly.

## Development workflow
```bash
npm install
npm run build
node dist/index.js
```
For CLI-based testing without Cursor, ensure `dist/` is current and run:

```bash
npm run debug
```

## Cursor configuration
Add the server to `~/.cursor/mcp.json` (or workspace `mcp.json`) under the `mcpServers` key.

Using `npx`:

```json
{
  "mcpServers": {
    "memorybank-mcp": {
      "command": "npx",
      "args": ["--yes", "memorybank-mcp"],
      "env": {
        "MEMORYBANK_BASE_URL": "https://example.com",
        "MEMORYBANK_API_KEY": "mbk_...",
        "MEMORYBANK_PROJECT_ID": "proj_123"
      }
    }
  }
}
```

Using a locally built binary:

```json
{
  "mcpServers": {
    "memorybank-mcp-local": {
      "command": "node",
      "args": ["/path/to/memorybank-mcp/dist/index.js"],
      "env": {
        "MEMORYBANK_BASE_URL": "https://example.com",
        "MEMORYBANK_API_KEY": "mbk_...",
        "MEMORYBANK_PROJECT_ID": "proj_123"
      }
    }
  }
}
```
