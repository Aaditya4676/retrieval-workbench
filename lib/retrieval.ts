import type { Result } from "./types";
export function rrf(
  vector: Result[],
  keyword: Result[],
  k: number,
  constant = 60,
): Result[] {
  const merged = new Map<string, Result>();
  for (const [kind, list] of [
    ["vector", vector],
    ["keyword", keyword],
  ] as const)
    list.forEach((item, index) => {
      const previous = merged.get(item.id) ?? { ...item, score: 0 };
      previous.score += 1 / (constant + index + 1);
      if (kind === "vector") previous.vectorRank = index + 1;
      else previous.keywordRank = index + 1;
      merged.set(item.id, previous);
    });
  return [...merged.values()]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, k);
}
export function metrics(results: string[], expected: string[]) {
  if (!expected.length)
    return {
      answerable: false,
      hit: null,
      reciprocalRank: null,
      allSources: null,
    };
  const first = results.findIndex((id) => expected.includes(id));
  return {
    answerable: true,
    hit: first >= 0 ? 1 : 0,
    reciprocalRank: first >= 0 ? 1 / (first + 1) : 0,
    allSources: expected.every((id) => results.includes(id)) ? 1 : 0,
  };
}
