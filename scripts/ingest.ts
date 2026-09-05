import { readFile, writeFile, mkdir } from "node:fs/promises";
import { embedding, MODEL } from "../lib/model";
import { dataRequest } from "../lib/data-client";
import type { Chunk } from "../lib/types";
const chunks: Chunk[] = JSON.parse(
  await readFile("corpus/chunks.json", "utf8"),
);
await mkdir(".cache", { recursive: true });
const cachePath = ".cache/document-embeddings.json";
const cache: Record<string, number[]> = await readFile(cachePath, "utf8")
  .then(JSON.parse)
  .catch(() => ({}));
const output = [];
for (const chunk of chunks) {
  const key = `${MODEL.revision}:${chunk.id}`;
  cache[key] ??= (await embedding(chunk.text)).vector;
  output.push({ ...chunk, vector: cache[key] });
}
await writeFile(cachePath, JSON.stringify(cache));
console.log(await dataRequest("/ingest", { chunks: output }));
