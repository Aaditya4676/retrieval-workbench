import { describe, it, expect } from "vitest";
import { rrf, metrics } from "./retrieval";
import { stableId, sections } from "./chunking";
import { searchInput, type Result } from "./types";
import { postgresAdapter } from "./database";
const result = (id: string): Result => ({
  id,
  document: "doc",
  heading: "Heading",
  text: "text",
  source: "https://example.com",
  tokens: 2,
  score: 0,
});
describe("retrieval contract", () => {
  it("RRF rewards agreement, deduplicates and records independent ranks", () => {
    const rows = rrf([result("a"), result("b")], [result("b"), result("c")], 3);
    expect(rows.map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(rows[0]).toMatchObject({ vectorRank: 2, keywordRank: 1 });
  });
  it("keeps misses, unsupported controls and complete-source coverage distinct", () => {
    expect(metrics(["miss"], ["wanted"])).toMatchObject({
      hit: 0,
      reciprocalRank: 0,
    });
    expect(metrics(["a"], [])).toMatchObject({ answerable: false, hit: null });
    expect(metrics(["a", "x"], ["a", "b"])).toMatchObject({
      hit: 1,
      allSources: 0,
    });
    expect(metrics(["x", "b", "a"], ["a", "b"])).toMatchObject({
      reciprocalRank: 0.5,
      allSources: 1,
    });
  });
  it("stable IDs survive unrelated document insertion but change with source content", () => {
    const initial=sections("# Heading\nOriginal paragraph");
    const edited=sections("# New section\nUnrelated paragraph\n# Heading\nOriginal paragraph");
    expect(stableId("doc", initial[0].heading, initial[0].text)).toBe(stableId("doc", edited[1].heading, edited[1].text));
    expect(stableId("doc", "Heading", "a")).not.toBe(
      stableId("doc", "Heading", "b"),
    );
    expect(sections("# One\nText\n## Two\nOther")).toHaveLength(2);
  });
  it("validates input bounds and preserves the parameterized database boundary", async () => {
    expect(
      searchInput.safeParse({ query: "ok", mode: "magic", k: 100 }).success,
    ).toBe(false);
    expect(searchInput.safeParse({ query: "x".repeat(801) }).success).toBe(
      false,
    );
    expect(searchInput.parse({ query: "set state" }).k).toBe(5);
    let observed: unknown[] = [];
    const client = postgresAdapter({
      async query(sql, params) {
        observed = [sql, params];
        return { rows: [{ id: "safe" }] };
      },
    });
    const query = "'; DROP TABLE chunks; --";
    expect(
      (
        await client.query<{ id: string }>(
          "SELECT id FROM chunks WHERE id=$1",
          [query],
        )
      ).rows[0].id,
    ).toBe("safe");
    expect(observed).toEqual(["SELECT id FROM chunks WHERE id=$1", [query]]);
    const failed = postgresAdapter({
      async query() {
        throw new Error("database unavailable");
      },
    });
    await expect(failed.query("SELECT 1")).rejects.toThrow(
      "database unavailable",
    );
  });
});
