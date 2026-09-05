import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["--import", "tsx", path.resolve("packages/mcp-server/index.ts")],
  cwd: process.cwd(),
  stderr: "pipe",
});
const client = new Client(
  { name: "workbench-protocol-verifier", version: "0.1.0" },
  { capabilities: {} },
);
try {
  await client.connect(transport);
  const tools = await client.listTools();
  const search = await client.callTool({
    name: "search_docs",
    arguments: {
      query: "Zustand nested objects merging set",
      mode: "hybrid",
      k: 5,
    },
  });
  const text = search.content as { type: string; text: string }[];
  const result = JSON.parse(text[0].text);
  if (search.isError || !result.results.length)
    throw new Error("MCP search failed");
  const chunk = await client.callTool({
    name: "get_chunk",
    arguments: { id: result.results[0].id },
  });
  if (chunk.isError) throw new Error("MCP chunk failed");
  await mkdir("evidence", { recursive: true });
  await writeFile(
    "evidence/mcp-client.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        client:
          "Real MCP SDK Client over spawned-process stdio; Codex/Claude demonstration deferred",
        server: client.getServerVersion(),
        tools,
        search,
        chunk,
        passed: true,
      },
      null,
      2,
    ),
  );
  console.log(
    "MCP initialize, listTools, search_docs, get_chunk passed over stdio.",
  );
} finally {
  await client.close();
}
