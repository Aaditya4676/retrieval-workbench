"use client";
import { useRef, useState } from "react";
import type { Result } from "@/lib/types";
import type { Answer } from "@/lib/generation";
export default function AnswerPanel({
  query,
  mode,
  busy,
  onBusy,
  onSources,
  onInspect,
}: {
  query: string;
  mode: string;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onSources: (sources: {
    results: Result[];
    mode: string;
    elapsedMs: number;
    embedding: null;
  }) => void;
  onInspect: (chunk: Result) => void;
}) {
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [sources, setSources] = useState<Result[]>([]);
  const abort = useRef<AbortController | null>(null);
  async function generate() {
    setDraft("");
    setAnswer(null);
    setError("");
    setQuestion(query);
    setRunning(true);
    onBusy(true);
    abort.current = new AbortController();
    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode, k: 5 }),
        signal: abort.current.signal,
      });
      if (!response.ok) throw new Error((await response.json()).error);
      if (!response.body)
        throw new Error("Answer stream was unavailable. Try again.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lines = "";
      let receivedFinal = false;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        lines += decoder.decode(part.value, { stream: true });
        let end;
        while ((end = lines.indexOf("\n")) >= 0) {
          const line = lines.slice(0, end);
          lines = lines.slice(end + 1);
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "sources") {
            setSources(event.results);
            onSources(event);
          }
          if (event.type === "draft") setDraft(event.answer);
          if (event.type === "final") {
            setAnswer(event);
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
              setDraft("");
            receivedFinal = true;
          }
          if (event.type === "error") throw new Error(event.error);
        }
      }
      if (!receivedFinal)
        throw new Error(
          "The answer stream ended before validation. Retry or inspect the passages.",
        );
    } catch (failure) {
      setDraft("");
      setError(
        failure instanceof Error && failure.name === "AbortError"
          ? "Answer stopped. Passage search remains available."
          : failure instanceof Error
            ? failure.message
            : "Answer failed. Inspect the passages and retry.",
      );
    } finally {
      onBusy(false);
      setRunning(false);
      abort.current = null;
    }
  }
  return (
    <section className="answer-region" aria-labelledby="answer-heading">
      <h2 id="answer-heading">Draft an answer from the passages</h2>
      <p className="help">
        Optional local experiment with Ollama. Quotes are checked against the
        retrieved text; that check does not prove the answer is correct.
      </p>
      <div className="answer-actions">
        <button
          type="button"
          disabled={busy || query.trim().length < 2}
          onClick={() => void generate()}
        >
          Draft an answer
        </button>
        {running && (
          <button type="button" onClick={() => abort.current?.abort()}>
            Stop answer
          </button>
        )}
      </div>
      <div role="status" aria-live="polite">
        {running
          ? draft
            ? "Draft received. Checking its source citations…"
            : "Retrieving sources and loading the local answer model…"
          : answer
            ? `${answer.citations.length} source citations checked.`
            : ""}
      </div>
      {question && (answer || draft) && (
        <p className="help">Answer for “{question}”</p>
      )}
      <div className="answer-stack">
        {draft && (
          <div
            className={`answer-copy answer-draft${answer ? " is-retiring" : ""}`}
            aria-hidden={answer ? true : undefined}
            inert={Boolean(answer)}
            onAnimationEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                event.animationName === "answer-draft-out"
              )
                setDraft("");
            }}
          >
            <p className="help">Unvalidated draft</p>
            <p>{draft}</p>
          </div>
        )}
        {answer && (
          <div className="answer-copy answer-final">
            <p>{answer.answer}</p>
            {answer.citations.length > 0 && (
              <ul className="answer-citations">
                {answer.citations.map((citation, index) => (
                  <li key={`${citation.chunkId}-${index}`}>
                    <button
                      type="button"
                      onClick={() => {
                        const source = sources.find(
                          (chunk) => chunk.id === citation.chunkId,
                        );
                        if (source) onInspect(source);
                      }}
                    >
                      Inspect cited passage {index + 1}
                    </button>
                    <blockquote>{citation.quote}</blockquote>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
