import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import { metrics } from "../lib/retrieval";
import type { Result } from "../lib/types";
const labels = await readFile("evals/questions.json", "utf8");
const questions: {
  id: string;
  kind: string;
  query: string;
  expected: string[];
}[] = JSON.parse(labels).questions;
const rows = [];
const summary = [];
for (const mode of ["keyword", "vector", "hybrid"]) {
  const modeRows = [];
  for (const question of questions) {
    const response = await fetch("http://127.0.0.1:3300/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question.query, mode, k: 5 }),
      signal: AbortSignal.timeout(180000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(result));
    const ids = result.results.map((chunk: Result) => chunk.id);
    const row = {
      id: question.id,
      kind: question.kind,
      mode,
      query: question.query,
      expected: question.expected,
      retrieved: ids,
      metrics: metrics(ids, question.expected),
      elapsedMs: result.elapsedMs,
      embedding: result.embedding,
    };
    modeRows.push(row);
    rows.push(row);
  }
  const answerable = modeRows.filter((row) => row.metrics.answerable);
  const paired = answerable.filter((row) => row.kind === "two-source");
  const controls = modeRows.filter((row) => !row.metrics.answerable);
  summary.push({
    mode,
    answerable: answerable.length,
    hitAt5:
      answerable.reduce((sum, r) => sum + r.metrics.hit!, 0) /
      answerable.length,
    mrrAt5:
      answerable.reduce((sum, r) => sum + r.metrics.reciprocalRank!, 0) /
      answerable.length,
    twoSourceCoverage:
      paired.reduce((sum, r) => sum + r.metrics.allSources!, 0) / paired.length,
    twoSourceDenominator: paired.length,
    unsupportedControls: controls.length,
    unsupportedReturnedResults: controls.filter(
      (row) => row.retrieved.length > 0,
    ).length,
    meanLatencyMs:
      modeRows.reduce((sum, r) => sum + r.elapsedMs, 0) / modeRows.length,
  });
}
await mkdir("evidence", { recursive: true });
const output = {
  generatedAt: new Date().toISOString(),
  status: "final retrieval evaluation; generation evaluation not performed",
  datasetHash: createHash("sha256").update(labels).digest("hex"),
  corpus: JSON.parse(await readFile("corpus/manifest.json", "utf8")),
  conditions: {
    os: os.platform(),
    release: os.release(),
    cpu: os.cpus()[0].model,
    ramGB: Math.round(os.totalmem() / 1024 ** 3),
    node: process.version,
    server: "Next production on localhost:3300",
    requests: 60,
    concurrency: 1,
    k: 5,
    note: "One run per question and mode; 20 labeled development queries. No claim of held-out generalization. Unsupported controls excluded from answerable retrieval denominators; no abstention classifier.",
  },
  summary,
  rows,
};
await writeFile(
  "evidence/retrieval-eval.json",
  JSON.stringify(output, null, 2),
);
await writeFile("evals/results.json", JSON.stringify(output, null, 2));
console.table(summary);
