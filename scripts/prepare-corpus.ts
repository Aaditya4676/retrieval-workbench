import { env, AutoTokenizer } from "@huggingface/transformers";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { sections, stableId } from "../lib/chunking";
import { MODEL } from "../lib/model";
import type { Chunk } from "../lib/types";
env.cacheDir = path.resolve(".cache/transformers");
const tokenizer = await AutoTokenizer.from_pretrained(MODEL.id, {
  revision: MODEL.revision,
});
const sources = JSON.parse(
  await readFile("corpus/sources.json", "utf8"),
).sources;
const chunks: Chunk[] = [];
for (const source of sources) {
  for (const section of sections(await readFile(source.file, "utf8"))) {
    const words = section.text.split(/\s+/);
    let start = 0;
    while (start < words.length) {
      let end = start;
      let text = "";
      while (end < words.length) {
        const candidate = `${section.heading}\n${words.slice(start, end + 1).join(" ")}`;
        if (tokenizer(candidate, { truncation: false }).input_ids.size > 220)
          break;
        text = candidate;
        end++;
      }
      if (end === start) throw new Error("Single token exceeds chunk budget");
      const tokens = tokenizer(text, { truncation: false }).input_ids.size;
      chunks.push({
        id: stableId(source.id, section.heading, text),
        document: source.id,
        heading: section.heading,
        text,
        source: source.source,
        tokens,
      });
      if (end === words.length) break;
      start = Math.max(start + 1, end - 20);
    }
  }
}
if (chunks.length >= 300) throw new Error("Corpus scope exceeded");
await writeFile("corpus/chunks.json", JSON.stringify(chunks, null, 2));
await writeFile(
  "corpus/manifest.json",
  JSON.stringify(
    {
      model: MODEL,
      chunker:
        "heading-aware; at most 220 wordpieces including heading/special tokens; 20-word overlap",
      chunks: chunks.length,
      hash: createHash("sha256").update(JSON.stringify(chunks)).digest("hex"),
    },
    null,
    2,
  ),
);
await mkdir("evals", { recursive: true });
console.log(
  chunks
    .map((chunk) => `${chunk.id} | ${chunk.heading} | ${chunk.tokens}`)
    .join("\n"),
);
