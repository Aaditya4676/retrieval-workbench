import { z } from "zod";
export const searchInput = z.object({
  query: z.string().trim().min(2).max(800),
  mode: z.enum(["keyword", "vector", "hybrid"]).default("hybrid"),
  k: z.number().int().min(1).max(10).default(5),
});
export type SearchInput = z.infer<typeof searchInput>;
export interface Chunk {
  id: string;
  document: string;
  heading: string;
  text: string;
  source: string;
  tokens: number;
}
export interface Result extends Chunk {
  score: number;
  vectorRank?: number;
  keywordRank?: number;
}
