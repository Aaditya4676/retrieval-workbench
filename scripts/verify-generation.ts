import { readFile, writeFile } from "node:fs/promises";
const query = process.argv[2] ?? "How does Zustand update nested objects?";
const response = await fetch("http://127.0.0.1:3300/api/answer", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, mode: "hybrid", k: 5 }),
  signal: AbortSignal.timeout(240000),
});
const text = await response.text();
const events = text
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
await writeFile(
  "evidence/generation-route-proof.json",
  JSON.stringify(
    { testedAt: new Date().toISOString(), query, events },
    null,
    2,
  ),
);
const final = events.find((event) => event.type === "final");
if (!final)
  throw new Error(
    JSON.stringify(events.find((event) => event.type === "error")),
  );
console.log({
  answer: final.answer,
  citations: final.citations,
  elapsedMs: final.elapsedMs,
  metrics: final.metrics,
  draftBeforeFinal: events.some((event) => event.type === "draft"),
});
const snapshot = JSON.parse(
  await readFile("evidence/retrieval-eval.json", "utf8"),
);
console.log("Frozen retrieval eval remains dated", snapshot.generatedAt);
