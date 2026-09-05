/** Offline reporting only: never reruns retrieval or calls the answer model. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const path = "evidence/generation-eval.json";
const report = JSON.parse(await readFile(path, "utf8"));
type Event = {
  type: string;
  model?: string;
  error?: string;
  citations?: { chunkId: string }[];
};
type Row = { mode: string; elapsedMs: number; events: Event[]; error?: string };
const rows: Row[] = report.rows;
if (report.completed !== 60 || rows.length !== 60)
  throw new Error("The generation pass is not complete");
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
if (
  hash(await readFile("evidence/retrieval-eval.json", "utf8")) !==
  report.retrievalReferenceSha256
)
  throw new Error("Retrieval reference changed");
if (
  hash(await readFile("evals/questions.json", "utf8")) !== report.labelsSha256
)
  throw new Error("Frozen labels changed");
report.rawRowsSha256 = hash(JSON.stringify(rows));
report.runtime = JSON.parse(
  (await readFile("evidence/ollama-model-metadata.json", "utf8")).replace(
    /^\uFEFF/,
    "",
  ),
);
for (const summary of report.summary) {
  // An error event does not establish that the answer model was called.
  delete summary.actualModelCalls;
  const selected = rows.filter((row) => row.mode === summary.mode);
  summary.noPassageFinals = selected.filter((row) =>
    row.events.some(
      (event) => event.type === "final" && event.model === "none",
    ),
  ).length;
  summary.validatedModelOutputs = selected.filter((row) =>
    row.events.some(
      (event) => event.type === "final" && event.model === "qwen2.5-coder:7b",
    ),
  ).length;
  summary.blockedCitationOutputs = selected.filter((row) =>
    row.events.some(
      (event) =>
        event.type === "error" &&
        event.error?.startsWith("A generated citation did not match"),
    ),
  ).length;
  summary.validationObservedOutputs =
    summary.validatedModelOutputs + summary.blockedCitationOutputs;
  summary.invalidCitationOutputRate = summary.validationObservedOutputs
    ? summary.blockedCitationOutputs / summary.validationObservedOutputs
    : null;
  summary.failedRequests = selected.filter(
    (row) => !row.events.some((event) => event.type === "final"),
  ).length;
  summary.otherFailedRequests =
    summary.failedRequests - summary.blockedCitationOutputs;
  summary.meanRequestMs =
    selected.reduce((total, row) => total + row.elapsedMs, 0) / selected.length;
}
report.reporting = {
  derivedAt: new Date().toISOString(),
  method:
    "Offline derivation from saved NDJSON events only. No additional inference or retrieval requests.",
  invalidCitationDenominator:
    "Model outputs observed at final citation validation: validated qwen2.5-coder:7b final events plus explicit citation-validation errors. No-passage responses and unclassified failures are excluded from this denominator, but every request stays in citation-coverage and failure-rate denominators.",
  latency:
    "Elapsed application requests on a shared local laptop; includes retrieval and optional generation. No-passage requests are included. Not a service-level guarantee.",
};
await writeFile(path, JSON.stringify(report, null, 2));
console.table(report.summary);
