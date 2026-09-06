# Deployment

No deployment, remote repository, API purchase, cloud database, or model-account login has been performed. The running local app is not evidence that Linux native inference or Supabase already works.

## Preserve the embedder

`Xenova/all-MiniLM-L6-v2` is the shipped embedding model, not a temporary provider. Keep revision `751bff37182d3f1213fa05d7196b954e230abad9`, q8 CPU ONNX, mean pooling, normalization, 384 dimensions, and the token limit. The Next route must keep executing query embeddings itself. Ollama is only an optional local answer generator; a hosted chat model replaces answer generation only.

The app externalizes `@huggingface/transformers`, `onnxruntime-node`, and `sharp` in `next.config.ts`. These native dependencies require a compatible Node/Linux build and runtime. Windows-installed native modules cannot be copied to Linux. Install the locked dependencies on the target build platform and run `pnpm build` there.

The ignored local cache lives at `.cache/transformers`; a fresh host does not receive it through Git. Choose a verified build-time download plus output-file tracing strategy, or a writable runtime cache with bounded cold-start downloads. Inspect the final bundle for the pinned tokenizer/config/quantized ONNX assets and native Linux binding. Verify filesystem-write constraints, artifact size, memory, function duration, and cold-start behavior on the chosen free host before publishing the API. `MODEL_CACHE_DIR` can override the local default `process.cwd()/.cache/transformers` for a writable host cache. No serverless cache strategy has been verified yet.

## Database migration

`lib/db.ts` now selects the server-only transport. When `DATABASE_URL` is set, a real node-postgres Pool is wrapped by `postgresAdapter`; otherwise the existing PGlite owner at `DATA_SERVICE_URL` (default port 3301) receives only the fixed parameterized read queries. Search and chunk routes use this client. Set `DATABASE_URL` on the hosted server so it never needs a laptop transport. The Pool has a per-instance connection limit and query/connect timeouts; a real Supabase connection and migration remain untested. Keep credentials server-side.

1. Create the Supabase project; obtain its PostgreSQL connection URL.
2. Enable pgvector and apply `migrations/001_chunks.sql` to an isolated project schema/database.
3. Ingest the committed chunks using the same pinned MiniLM vectors; compare row count, corpus hash, dimensionality, and representative vector/full-text results with local evidence.
4. Keep ingestion as an admin operation. The data owner's `POST /ingest` denies every request unless `INGEST_TOKEN` is configured and the request supplies its exact bearer token. Set the same token in the data-owner and `pnpm ingest` process environments. Leaving it unset disables ingestion; existing passage search still works. The loopback transport is not the hosted database path.
5. Use a bounded server-side query adapter and database connection pooling appropriate for the selected host. PGlite's filesystem directory is a local development implementation, not a deployable Supabase replacement.

## Build and environment

Local build: `pnpm install --frozen-lockfile`, `pnpm build`. Local start: `pnpm start`. Local data owner: `pnpm data`. Next currently binds `127.0.0.1:3300`; hosting supplies its own bind/port contract.

| Variable | Purpose | Local default |
| --- | --- | --- |
| `NEXT_PUBLIC_PORTFOLIO_URL` | Portfolio link; set before building | `http://127.0.0.1:3100` |
| `DATA_SERVICE_URL` | Current private local data transport | `http://127.0.0.1:3301` |
| `RAG_API_URL` | MCP client's retrieval endpoint | `http://127.0.0.1:3300` |
| `MODEL_CACHE_DIR` | Writable pinned-model cache directory | `.cache/transformers` under the app |
| `DATABASE_URL` | Server-only node-postgres connection through `postgresAdapter` | Unset selects PGlite transport; hosted connection untested |
| `INGEST_TOKEN` | Data-owner and ingestion CLI bearer credential | Unset denies ingestion |
| `ANSWER_BASE_URL` | Base URL of an Ollama-compatible streaming `/api/chat` service | `http://127.0.0.1:11434` |
| `ANSWER_MODEL` | Answer-generation model name | `qwen2.5-coder:7b` |

## Hosted acceptance checklist

- Build from a clean Linux dependency installation and prove a cold and warm query embedding in the actual hosted Next route.
- Verify that the model revision, normalization, dimension and corpus hash match the recorded retrieval evaluation. Retrieval results should remain comparable; rerun as a new verification artifact if the database/query code changes.
- Confirm database persistence, vector/full-text parity and private credentials.
- Apply a persistent public request quota and bounded input/output/concurrency before exposing expensive inference; the loopback demonstration does not implement a public quota.
- Configure the chosen hosted chat model separately. Measure grounded-answer/citation coverage and latency anew; do not relabel retrieval hit@5 as generation accuracy.
- Repeat browser keyboard/accessibility checks and public source links. Replace localhost portfolio/demo links with verified public URLs.
- Run both MCP tools against the hosted API, then capture a real MCP client session using them. Stdio remains a locally spawned server; it is not an HTTP deployment endpoint.

The final retrieval measurements are in `evidence/retrieval-eval.json`; preserve them as the local reference. Do not overwrite their model/corpus metadata or claim a hosted result before checking it.

## Local answer-generation implementation

`app/api/answer/route.ts` reads `ANSWER_BASE_URL` and `ANSWER_MODEL`, with the existing Ollama service/model as defaults. The configured service must speak Ollama's streaming `/api/chat` protocol; these variables do not turn it into an OpenAI-compatible client. Both search and answer routes call `lib/search.ts` directly, which embeds in the Next process and runs `searchDatabase` through the selected server-only client. No HTTP request back to the application's own search route is needed.

NDJSON source, unvalidated-draft, final and error events retain the same schema and exact citation validation. Every answer request owns its cancellation and 120-second model timeout, with 4096 context tokens and at most 320 generated tokens. There is no process-wide concurrency claim: a persistent hosted quota/limiter remains a hosting prerequisite. The existing Ollama service is not owned or stopped by this project. A changed answer model requires a separate generation evaluation; the permanent embedder and frozen retrieval reference stay unchanged.

The structural decoder schema intentionally omits grammar-level string-length bounds because the current local runner stopped with the full Zod schema. Strict final Zod bounds, source-ID membership and exact quote checks remain active. Hosted model support for its chosen structured-output API must be verified independently.
