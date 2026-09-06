import { readFile, writeFile, mkdir } from "node:fs/promises";
import { Pool } from "pg";
import { embedding, MODEL } from "../lib/model";
import type { Chunk } from "../lib/types";

/**
 * Seeds a standard PostgreSQL database (Neon, Supabase, RDS) directly.
 *
 * `ingest.ts` posts to the loopback PGlite service, which only exists on a
 * developer machine. A hosted deployment needs the same rows written over a
 * real connection, so this script owns that path and shares the embedding
 * cache with the local one.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "Set DATABASE_URL to the target PostgreSQL connection string first.",
  );
  process.exit(1);
}

const chunks: Chunk[] = JSON.parse(
  await readFile("corpus/chunks.json", "utf8"),
);
await mkdir(".cache", { recursive: true });
const cachePath = ".cache/document-embeddings.json";
const cache: Record<string, number[]> = await readFile(cachePath, "utf8")
  .then(JSON.parse)
  .catch(() => ({}));

let computed = 0;
const rows = [];
for (const chunk of chunks) {
  const key = `${MODEL.revision}:${chunk.id}`;
  if (!cache[key]) {
    cache[key] = (await embedding(chunk.text)).vector;
    computed++;
    if (computed % 20 === 0)
      console.log(`  embedded ${computed} new chunks...`);
  }
  rows.push({ ...chunk, vector: cache[key] });
}
await writeFile(cachePath, JSON.stringify(cache));
console.log(
  `Prepared ${rows.length} chunks (${computed} newly embedded, ${rows.length - computed} from cache).`,
);

// Neon and most hosted providers require TLS; the certificate is theirs, not ours.
const pool = new Pool({ connectionString, max: 3, ssl: { rejectUnauthorized: false } });
try {
  await pool.query(await readFile("migrations/001_chunks.sql", "utf8"));
  console.log("Schema applied (pgvector extension, chunks table, index).");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows)
      await client.query(
        "INSERT INTO chunks(id,document,heading,content,source,tokens,embedding) VALUES($1,$2,$3,$4,$5,$6,$7::vector) ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document, heading=EXCLUDED.heading, content=EXCLUDED.content, source=EXCLUDED.source, tokens=EXCLUDED.tokens, embedding=EXCLUDED.embedding",
        [
          row.id,
          row.document,
          row.heading,
          row.text,
          row.source,
          row.tokens,
          JSON.stringify(row.vector),
        ],
      );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const count = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::integer AS count FROM chunks",
  );
  const dims = await pool.query<{ dims: number }>(
    "SELECT vector_dims(embedding) AS dims FROM chunks LIMIT 1",
  );
  console.log(
    `Done. ${count.rows[0].count} rows in chunks; embedding dimensions: ${dims.rows[0]?.dims}.`,
  );
} finally {
  await pool.end();
}
