# MCP stdio server

Tools: `search_docs(query, mode, k)` and `get_chunk(id)`. Search delegates to the same Next production route as the browser and evaluation script. The server writes only MCP JSON-RPC to stdout. The tool descriptions explicitly distinguish source content from instructions and retrieval from answerability.

## Verified locally

`pnpm verify:mcp` spawns a real MCP SDK Client/stdio transport, initializes the server, lists the tools, calls search, and fetches an exact chunk. Evidence: `../../evidence/mcp-client.json`. MCP Inspector 2.5.0 also successfully initialized, listed, and called both tools; `../../evidence/inspector-tools.json` is its real CLI output. The actual Inspector browser screenshot is `../../evidence/screenshots/mcp-inspector-search.png`. A Codex or Claude conversational demonstration remains pending.

Start the app and data owner first, then from the repository root:

```powershell
pnpm verify:mcp
pnpm exec mcp-inspector --cli --config mcp.inspector.json --server retrieval-workbench --method tools/list --format json
```

Inspector's web UI can be launched with the same `--config mcp.inspector.json`. Use a project-local `MCP_STORAGE_DIR` and `MCP_AUTO_OPEN_ENABLED=false` for unattended checks. Its generated local auth token is not a project credential and should not be committed. `mcp.inspector.json` contains this machine's absolute paths; update them when moving the project.

## Codex example

The installed `codex mcp add --help` confirms the current stdio command shape below. This is an example for tomorrow; it was **not executed**, because it writes client configuration.

```powershell
codex mcp add retrieval-workbench --env RAG_API_URL=http://127.0.0.1:3300 -- node --import file:///Z:/STUDY/res/Portfolio/apps/rag/node_modules/tsx/dist/loader.mjs Z:/STUDY/res/Portfolio/apps/rag/packages/mcp-server/index.ts
```

An absolute tsx loader avoids relying on whichever directory the client uses. The exact absolute-loader command successfully initialized and listed both tools from a different working directory; see `../../evidence/mcp-portable-command.json`. Inside a configured Codex task, ask: “Use retrieval-workbench search_docs to find how Zustand merges nested objects, then fetch the first chunk and cite its source.”

## Claude Code example

From this repository, a project-scoped configuration avoids changing unrelated projects:

```powershell
claude mcp add --transport stdio --scope project retrieval-workbench -- node --import file:///Z:/STUDY/res/Portfolio/apps/rag/node_modules/tsx/dist/loader.mjs Z:/STUDY/res/Portfolio/apps/rag/packages/mcp-server/index.ts
```

This configuration example follows [Claude Code's MCP documentation](https://code.claude.com/docs/en/mcp). It was not installed or tested in Claude Code tonight.

## Claude Desktop example

Merge this entry into the desktop client's configuration tomorrow, after reviewing its existing entries; do not replace the whole file. The [official local-server guide](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/develop/connect-local-servers.mdx) describes the configuration location and restart flow.

```json
{
  "mcpServers": {
    "retrieval-workbench": {
      "command": "C:/nvm4w/nodejs/node.exe",
      "args": [
        "--import",
        "file:///Z:/STUDY/res/Portfolio/apps/rag/node_modules/tsx/dist/loader.mjs",
        "Z:/STUDY/res/Portfolio/apps/rag/packages/mcp-server/index.ts"
      ],
      "env": { "RAG_API_URL": "http://127.0.0.1:3300" }
    }
  }
}
```

All examples require the local Next/data servers to be running. Tomorrow `RAG_API_URL` can target the deployed retrieval API; keep any future authentication token server-side and never write it to protocol logs.

