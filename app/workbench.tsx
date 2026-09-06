"use client";
import { useRef, useState, type FormEvent } from "react";
import type { Result } from "@/lib/types";
import AnswerPanel from "./answer-panel";
interface Summary {
  mode: string;
  hitAt5: number;
  mrrAt5: number;
  twoSourceCoverage: number;
  twoSourceDenominator: number;
  answerable: number;
}
interface SearchResponse {
  results: Result[];
  mode: string;
  elapsedMs: number;
  embedding: {
    execution: string;
    environment: string;
    dimensions: number;
    elapsedMs: number;
    revision: string;
  } | null;
}
const samples = [
  "Zustand nested objects merging set",
  "How do Zustand nested object updates differ from TanStack Query optimistic updates made directly in the UI?",
  "Compare Zustand persist partialize and TanStack Query gcTime: what do they control?",
];
export default function Workbench({
  count,
  evaluation,
  initialQuery,
  initialMode,
}: {
  count: number;
  evaluation: Summary[];
  initialQuery?: string;
  initialMode: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? samples[0]);
  const [mode, setMode] = useState(initialMode);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const busy = searching || generating;
  const [error, setError] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [selected, setSelected] = useState<Result | null>(null);
  const [submitted, setSubmitted] = useState("");
  const detail = useRef<HTMLElement>(null);
  async function search(event?: FormEvent, nextQuery = query) {
    event?.preventDefault();
    if (busy) return;
    setSearching(true);
    setError("");
    setSelected(null);
    setSubmitted(nextQuery);
    window.history.replaceState(
      null,
      "",
      `?${new URLSearchParams({ q: nextQuery, mode })}`,
    );
    try {
      const result = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nextQuery, mode, k: 5 }),
        signal: AbortSignal.timeout(180000),
      });
      const json = await result.json();
      if (!result.ok) throw new Error(json.error);
      setResponse(json);
    } catch (failure) {
      setError(
        failure instanceof TypeError
          ? "Search failed. Confirm the local servers are running, then retry."
          : failure instanceof Error
            ? failure.message
            : "Search failed. Check the local servers and retry.",
      );
      setResponse(null);
    } finally {
      setSearching(false);
    }
  }
  function inspect(result: Result) {
    setSelected(result);
    requestAnimationFrame(() => detail.current?.focus());
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to search
      </a>
      <header className="site-header">
        <a
          href={
            process.env.NEXT_PUBLIC_PORTFOLIO_URL ?? "http://127.0.0.1:3100"
          }
        >
          Aaditya Khedekar
        </a>
        <nav aria-label="Project navigation">
          <a href="#evaluation">Evaluation</a>
          <a href="#method">How it works</a>
        </nav>
      </header>
      <main id="main">
        <div className="intro">
          <div>
            <h1>Retrieval workbench</h1>
            <p>Find the passage. Check the source.</p>
          </div>
          <p className="corpus-note">
            Zustand and TanStack Query
            <br />
            {count} committed passages, searched locally.
          </p>
        </div>
        <section className="search-region" aria-labelledby="search-heading">
          <h2 id="search-heading">Search the documentation</h2>
          <form onSubmit={search}>
            <label htmlFor="query">Your question</label>
            <textarea
              id="query"
              name="query"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              minLength={2}
              maxLength={800}
              required
              rows={3}
              aria-describedby="query-help"
            />
            <div className="search-controls">
              <div>
                <label htmlFor="mode">Retrieval method</label>
                <select
                  id="mode"
                  name="mode"
                  autoComplete="off"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="hybrid">Hybrid — combine both rankings</option>
                  <option value="vector">Vector — match meaning</option>
                  <option value="keyword">Keyword — match terms</option>
                </select>
              </div>
              <button className="primary" type="submit" disabled={busy}>
                {searching ? "Searching…" : "Search passages"}
              </button>
            </div>
            <p id="query-help" className="help">
              Choose a method to compare its top five passages. First semantic
              search loads the local model.
            </p>
          </form>
          <details className="examples">
            <summary>Try a different question</summary>
            {samples.map((sample) => (
              <button
                key={sample}
                type="button"
                disabled={busy}
                onClick={() => {
                  setQuery(sample);
                  void search(undefined, sample);
                }}
              >
                {sample}
              </button>
            ))}
          </details>
        </section>
        {busy && (
          <div className="search-progress" aria-hidden="true">
            <span className="search-progress__bar" />
          </div>
        )}
        <div className="status" role="status" aria-live="polite">
          {searching
            ? "Searching the committed corpus…"
            : response
              ? `${response.results.length} passages found with ${response.mode} search in ${(response.elapsedMs / 1000).toFixed(2)} seconds.`
              : "Run a search, then inspect a passage to see its exact source text."}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="workspace">
          <section aria-labelledby="results-heading" className="results">
            <h2 id="results-heading">Ranked passages</h2>
            {response && <p className="help">Results for “{submitted}”</p>}
            {!response && (
              <p className="empty">
                Your evidence appears here. The same search powers the app,
                evaluation runner, and MCP tools.
              </p>
            )}
            {response?.results.length === 0 && (
              <p className="empty">
                {response.mode === "keyword"
                  ? "Keyword search requires every query term to match in one passage. Try fewer terms or switch to vector search."
                  : "No passages came back from this corpus. Try a question about the included Zustand or TanStack Query documentation."}
              </p>
            )}
            <ol className="result-list">
              {response?.results.map((result) => (
                <li
                  key={result.id}
                  className={selected?.id === result.id ? "selected" : ""}
                >
                  <div className="result-meta">
                    {result.document.startsWith("zustand")
                      ? "Zustand"
                      : "TanStack Query"}
                    <span>{result.tokens} tokens</span>
                  </div>
                  <h3>
                    <button
                      type="button"
                      onClick={() => inspect(result)}
                      aria-pressed={selected?.id === result.id}
                    >
                      {result.heading === "Overview"
                        ? result.document
                            .replace(/^(zustand|query)-/, "")
                            .replaceAll("-", " ")
                        : result.heading}
                    </button>
                  </h3>
                  <p>
                    {result.text
                      .slice(result.heading.length)
                      .trim()
                      .slice(0, 240)}
                    {result.text.length > 240 ? "…" : ""}
                  </p>
                  <div className="result-footer">
                    <button type="button" onClick={() => inspect(result)}>
                      Inspect passage
                    </button>
                    <span>
                      Score {result.score.toFixed(4)}
                      {result.vectorRank
                        ? ` / vector ${result.vectorRank}`
                        : ""}
                      {result.keywordRank
                        ? ` / keyword ${result.keywordRank}`
                        : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <div className="reading-column">
            <aside
              ref={detail}
              tabIndex={-1}
              className="source-panel"
              aria-labelledby="source-heading"
            >
              <h2 id="source-heading">Source inspection</h2>
              {selected ? (
                <div key={selected.id} className="source-document">
                  <p className="chunk-id">{selected.id}</p>
                  <h3>{selected.heading}</h3>
                  <p className="source-text">{selected.text}</p>
                  <a href={selected.source} target="_blank" rel="noreferrer">
                    Open the pinned source on GitHub
                  </a>
                </div>
              ) : (
                <p className="empty">
                  Select a ranked passage. Its complete, committed text will
                  appear here so you can verify the evidence.
                </p>
              )}
              <p className="source-caution">
                Retrieval finds related passages. It does not prove that a
                question is answerable.
              </p>
            </aside>
            <AnswerPanel
              query={query}
              mode={mode}
              busy={busy}
              onBusy={setGenerating}
              onSources={(sources) => {
                setResponse(sources);
                setSubmitted(query);
                setSelected(null);
              }}
              onInspect={inspect}
            />
          </div>
        </div>
        {response?.embedding && (
          <details className="execution">
            <summary>Inspect query embedding execution</summary>
            <dl>
              <dt>Execution</dt>
              <dd>
                {response.embedding.execution} /{" "}
                {response.embedding.environment}
              </dd>
              <dt>Model</dt>
              <dd>
                Xenova/all-MiniLM-L6-v2, quantized,{" "}
                {response.embedding.dimensions} dimensions
              </dd>
              <dt>Revision</dt>
              <dd>{response.embedding.revision}</dd>
              <dt>Embedding time</dt>
              <dd>{response.embedding.elapsedMs.toFixed(1)} ms</dd>
            </dl>
          </details>
        )}
        <section
          id="evaluation"
          className="evaluation"
          aria-labelledby="evaluation-heading"
        >
          <h2 id="evaluation-heading">Measured retrieval</h2>
          <p>
            The same 20 questions, written before the first search run. Eighteen
            have labeled source passages; two are unsupported controls.
          </p>
          <div className="table-wrap">
            <table>
              <caption>
                Top five results over the frozen development set
              </caption>
              <thead>
                <tr>
                  <th scope="col">Method</th>
                  <th scope="col">Hit@5</th>
                  <th scope="col">MRR@5</th>
                  <th scope="col">Both sources</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.length ? (
                  evaluation.map((row) => (
                    <tr key={row.mode}>
                      <th scope="row">{row.mode}</th>
                      <td>{(row.hitAt5 * 100).toFixed(1)}%</td>
                      <td>{row.mrrAt5.toFixed(3)}</td>
                      <td>
                        {Math.round(
                          row.twoSourceCoverage * row.twoSourceDenominator,
                        )}
                        /{row.twoSourceDenominator}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>Evaluation has not run yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="help">
            Hit and MRR use 18 answerable questions. “Both sources” uses the two
            questions that need two passages. This small development set
            measures this corpus; it does not estimate general accuracy. Local
            generation is a separate experiment; hosted generation evaluation is
            tomorrow’s work.
          </p>
        </section>
        <section id="method" className="method">
          <h2>How it works</h2>
          <p>
            The browser, evaluation runner, and MCP client call the same Next.js
            search API. Semantic queries become real MiniLM embeddings inside
            that route handler; PostgreSQL-compatible local storage ranks the
            passages.
          </p>
          <ul>
            <li>Keyword search uses PostgreSQL full-text search.</li>
            <li>
              Vector search uses exact cosine distance over 384-dimensional
              embeddings.
            </li>
            <li>
              Hybrid search uses reciprocal rank fusion with a constant of 60.
            </li>
          </ul>
          <p>
            Sources are pinned to repository commits and carry their MIT
            licenses. This is a local engineering demonstration. Hosted database
            and hosted chat generation are tomorrow’s work. The optional local
            answer draft uses Ollama with exact source-quote checks.
          </p>
        </section>
      </main>
      <footer>
        Built by Aaditya Khedekar.{" "}
        <a
          href={
            process.env.NEXT_PUBLIC_PORTFOLIO_URL ?? "http://127.0.0.1:3100"
          }
        >
          Return to portfolio
        </a>
      </footer>
    </>
  );
}
