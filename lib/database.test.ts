import { describe, it, expect } from "vitest";
import { postgresAdapter, searchDatabase } from "./database";
import { authorizedIngest } from "./ingest-auth";

describe("PostgreSQL driver boundary", () => {
  const keywordSql =
    "SELECT id, document, heading, content AS text, source, tokens, ts_rank_cd(search_vector,websearch_to_tsquery('english',$1)) AS score FROM chunks WHERE search_vector @@ websearch_to_tsquery('english',$1) ORDER BY score DESC,id LIMIT 20";
  const vectorSql =
    "SELECT id, document, heading, content AS text, source, tokens, 1-(embedding <=> $1::vector) AS score FROM chunks ORDER BY embedding <=> $1::vector,id LIMIT 20";
  const countSql = "SELECT COUNT(*)::integer AS count FROM chunks";
  for (const mode of ["keyword", "vector", "hybrid"] as const) {
    it(`passes the exact ${mode} SQL and parameters through postgresAdapter`, async () => {
      const calls: unknown[] = [];
      const driver = {
        async query(sql: string, params?: unknown[]) {
          calls.push([sql, params]);
          return {
            rows:
              sql === countSql ? [{ count: 132 }] : [{ id: "one", score: 1 }],
          };
        },
      };
      const vector = Array(384).fill(0.25);
      const query = "nested '); DROP TABLE chunks; --";
      const result = await searchDatabase(postgresAdapter(driver), {
        query,
        mode,
        k: 5,
        vector,
      });
      expect(calls).toEqual([
        ...(mode !== "vector" ? [[keywordSql, [query]]] : []),
        ...(mode !== "keyword" ? [[vectorSql, [JSON.stringify(vector)]]] : []),
        [countSql, undefined],
      ]);
      expect(result.count).toBe(132);
      expect(result.results.map((row) => row.id)).toEqual(["one"]);
    });
  }
  it("denies ingestion when unconfigured or presented the wrong credential", () => {
    expect(authorizedIngest(undefined, undefined)).toBe(false);
    expect(authorizedIngest("Bearer test-secret", undefined)).toBe(false);
    expect(authorizedIngest("Bearer wrong", "test-secret")).toBe(false);
    expect(authorizedIngest("Bearer test-secret", "test-secret")).toBe(true);
  });
});
