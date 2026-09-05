import { z } from "zod";
import type { Result } from "./types";

// Keep decoder grammar structural. Ollama's local runner stopped with the full
// min/max-length Zod JSON schema; enforce those bounds on the final object below.
export const generationFormat = {
  type: "object",
  properties: {
    answer: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: { chunkId: { type: "string" }, quote: { type: "string" } },
        required: ["chunkId", "quote"],
        additionalProperties: false,
      },
    },
  },
  required: ["answer", "citations"],
  additionalProperties: false,
};

export const answerSchema = z.object({
  answer: z.string().min(1).max(3000),
  citations: z
    .array(z.object({ chunkId: z.string(), quote: z.string().min(1).max(400) }))
    .max(3),
});
export type Answer = z.infer<typeof answerSchema>;
export function validateAnswer(value: unknown, chunks: Result[]): Answer {
  const parsed = answerSchema.parse(value);
  for (const citation of parsed.citations) {
    const source = chunks.find((chunk) => chunk.id === citation.chunkId);
    if (!source || !source.text.includes(citation.quote))
      throw new Error(
        "A generated citation did not match the exact retrieved source. Inspect the passages instead.",
      );
  }
  if (!parsed.citations.length)
    return {
      answer:
        "The retrieved passages do not provide enough evidence to answer this question.",
      citations: [],
    };
  return parsed;
}
/** Only parse a complete JSON string; the enclosing response is still explicitly unvalidated. */
export function completedAnswerDraft(raw: string): string | null {
  const match = raw.match(/"answer"\s*:\s*("(?:[^"\\]|\\.)*")/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}
