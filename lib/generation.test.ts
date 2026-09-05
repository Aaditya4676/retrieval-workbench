import { describe, it, expect } from "vitest";
import { completedAnswerDraft, validateAnswer } from "./generation";
import type { Result } from "./types";
const chunk: Result = {
  id: "doc-a",
  heading: "State",
  document: "doc",
  source: "https://example.com",
  tokens: 6,
  text: "The set function merges one level.",
  score: 1,
};
describe("generation evidence boundary", () => {
  it("withholds incomplete JSON strings and decodes only a complete draft string", () => {
    expect(completedAnswerDraft('{"answer":"Incomplete')).toBeNull();
    expect(
      completedAnswerDraft('{"answer":"Say \\"hi\\"", "citations":['),
    ).toBe('Say "hi"');
  });
  it("rejects fabricated citations and withholds uncited claims", () => {
    expect(() =>
      validateAnswer(
        { answer: "Text", citations: [{ chunkId: "invented", quote: "set" }] },
        [chunk],
      ),
    ).toThrow();
    expect(() =>
      validateAnswer(
        {
          answer: "Text",
          citations: [{ chunkId: "doc-a", quote: "deeply merges" }],
        },
        [chunk],
      ),
    ).toThrow();
    expect(
      validateAnswer(
        {
          answer: "One level.",
          citations: [{ chunkId: "doc-a", quote: "merges one level" }],
        },
        [chunk],
      ).citations,
    ).toHaveLength(1);
    expect(
      validateAnswer({ answer: "An unsupported claim", citations: [] }, [chunk])
        .answer,
    ).toContain("not provide enough evidence");
  });
});
