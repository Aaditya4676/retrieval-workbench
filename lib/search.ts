import "server-only";
import { embedding, MODEL } from "./model";
import { getDatabase } from "./db";
import { searchDatabase } from "./database";
import type { SearchInput } from "./types";

/** Shared by the two Node route handlers; query inference stays inside Next. */
export async function search(query: SearchInput) {
  const started = performance.now();
  const embedded =
    query.mode === "keyword" ? null : await embedding(query.query);
  const result = await searchDatabase(getDatabase(), {
    ...query,
    vector: embedded?.vector,
  });
  return {
    ...result,
    mode: query.mode,
    query: query.query,
    elapsedMs: performance.now() - started,
    embedding: embedded && {
      ...MODEL,
      execution: "next-route-handler",
      environment: process.env.NODE_ENV,
      processId: process.pid,
      tokenCount: embedded.tokenCount,
      elapsedMs: embedded.elapsedMs,
      invocation: embedded.invocation,
      vectorDimensions: embedded.vector.length,
    },
  };
}
