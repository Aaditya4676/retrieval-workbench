import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { searchDatabase, chunkColumns, sqlStatements } from "../lib/database";
import { authorizedIngest } from "../lib/ingest-auth";
import { searchInput } from "../lib/types";
await mkdir(".data", { recursive: true });
const db = await PGlite.create({
  dataDir: path.resolve(".data/postgres"),
  extensions: { vector },
});
await db.exec(await readFile("migrations/001_chunks.sql", "utf8"));
const columns = chunkColumns;
const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1:3301");
    if (
      request.method === "POST" &&
      url.pathname === "/ingest" &&
      !authorizedIngest(request.headers.authorization, process.env.INGEST_TOKEN)
    ) {
      response.statusCode = 401;
      response.end(
        JSON.stringify({
          error: "Ingestion requires the configured INGEST_TOKEN bearer token.",
        }),
      );
      return;
    }
    if (request.method === "GET" && url.pathname === "/health") {
      const result = await db.query<{ count: number }>(
        "SELECT COUNT(*)::integer AS count FROM chunks",
      );
      response.end(
        JSON.stringify({
          status: "ok",
          engine: "PGlite",
          pid: process.pid,
          ...result.rows[0],
        }),
      );
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/chunks/")) {
      const result = await db.query(
        `SELECT ${columns} FROM chunks WHERE id=$1`,
        [decodeURIComponent(url.pathname.slice(8))],
      );
      if (!result.rows.length) response.statusCode = 404;
      response.end(
        JSON.stringify(result.rows[0] ?? { error: "Unknown chunk" }),
      );
      return;
    }
    let body = "";
    for await (const part of request) {
      body += part;
      if (body.length > 5_000_000) throw new Error("Request too large");
    }
    const input = JSON.parse(body || "{}");
    if (request.method === "POST" && url.pathname === "/query") {
      if (
        !Object.values(sqlStatements).includes(input.sql) ||
        (input.params !== undefined && !Array.isArray(input.params))
      ) {
        response.statusCode = 400;
        response.end(
          JSON.stringify({
            error: "Only the fixed parameterized read queries are supported.",
          }),
        );
        return;
      }
      response.end(JSON.stringify(await db.query(input.sql, input.params)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/ingest") {
      await db.transaction(async (tx) => {
        for (const chunk of input.chunks)
          await tx.query(
            "INSERT INTO chunks(id,document,heading,content,source,tokens,embedding) VALUES($1,$2,$3,$4,$5,$6,$7::vector) ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document, heading=EXCLUDED.heading,content=EXCLUDED.content,source=EXCLUDED.source,tokens=EXCLUDED.tokens,embedding=EXCLUDED.embedding",
            [
              chunk.id,
              chunk.document,
              chunk.heading,
              chunk.text,
              chunk.source,
              chunk.tokens,
              JSON.stringify(chunk.vector),
            ],
          );
      });
      response.end(JSON.stringify({ inserted: input.chunks.length }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/search") {
      const parsed = searchInput.parse(input);
      response.end(
        JSON.stringify(
          await searchDatabase(db, { ...parsed, vector: input.vector }),
        ),
      );
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    response.statusCode = 400;
    response.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Request failed",
      }),
    );
  }
});
server.listen(3301, "127.0.0.1", () =>
  console.log("PGlite owner listening on http://127.0.0.1:3301"),
);
async function shutdown() {
  server.close();
  await db.close();
  process.exit(0);
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
