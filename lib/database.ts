import { rrf } from "./retrieval";
import type { Result, SearchInput } from "./types";

/** PGlite and a standard PostgreSQL driver meet this narrow parameterized-SQL boundary. */
export interface SqlClient {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
export const chunkColumns =
  "id, document, heading, content AS text, source, tokens";
export async function searchDatabase(
  db: SqlClient,
  input: SearchInput & { vector?: number[] },
) {
  let keyword: Result[] = [];
  let vectors: Result[] = [];
  if (input.mode !== "vector")
    keyword = (
      await db.query<Result>(
        `SELECT ${chunkColumns}, ts_rank_cd(search_vector,websearch_to_tsquery('english',$1)) AS score FROM chunks WHERE search_vector @@ websearch_to_tsquery('english',$1) ORDER BY score DESC,id LIMIT 20`,
        [input.query],
      )
    ).rows;
  if (input.mode !== "keyword") {
    if (
      !Array.isArray(input.vector) ||
      input.vector.length !== 384 ||
      input.vector.some((n) => !Number.isFinite(n))
    )
      throw new Error("A finite 384-dimensional query vector is required");
    vectors = (
      await db.query<Result>(
        `SELECT ${chunkColumns}, 1-(embedding <=> $1::vector) AS score FROM chunks ORDER BY embedding <=> $1::vector,id LIMIT 20`,
        [JSON.stringify(input.vector)],
      )
    ).rows;
  }
  const results =
    input.mode === "keyword"
      ? keyword.slice(0, input.k)
      : input.mode === "vector"
        ? vectors.slice(0, input.k)
        : rrf(vectors, keyword, input.k);
  const counts = await db.query<{ count: number }>(
    "SELECT COUNT(*)::integer AS count FROM chunks",
  );
  return { results, count: counts.rows[0].count };
}

/** Wrap a node-postgres Pool/Client after the caller creates its private connection. */
export function postgresAdapter(driver: {
  query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}): SqlClient {
  return {
    async query<T>(sql: string, params?: unknown[]) {
      const result = await driver.query(sql, params);
      return { rows: result.rows as T[] };
    },
  };
}
