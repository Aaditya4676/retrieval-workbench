# Tomorrow's deployment handoff

No deployment, remote repository, API purchase, cloud database, or model-account login was performed tonight. The running local app is not evidence that Linux native inference or Supabase already works.

## Preserve the embedder

`Xenova/all-MiniLM-L6-v2` is the shipped embedding model, not a temporary provider. Keep revision `751bff37182d3f1213fa05d7196b954e230abad9`, q8 CPU ONNX, mean pooling, normalization, 384 dimensions, and the token limit. The Next route must keep executing query embeddings itself. Ollama is only an optional local answer generator; a hosted chat model replaces answer generation only.

The app externalizes `@huggingface/transformers`, `onnxruntime-node`, and `sharp` in `next.config.ts`. These native dependencies require a compatible Node/Linux build and runtime. Windows-installed native modules cannot be copied to Linux. Install the locked dependencies on the target build platform and run `pnpm build` there.

The ignored local cache lives at `.cache/transformers`; a fresh host does not receive it through Git. Choose a verified build-time download plus output-file tracing strategy, or a writable runtime cache with bounded cold-start downloads. Inspect the final bundle for the pinned tokenizer/config/quantized ONNX assets and native Linux binding. Verify filesystem-write constraints, artifact size, memory, function duration, and cold-start behavior on the chosen free host before publishing the API. `MODEL_CACHE_DIR` can override the local default `process.cwd()/.cache/transformers` for a writable host cache. No serverless cache strategy has been verified yet.

## Database migration

The local app calls a loopback PGlite owner at port 3301; Vercel must not point to a laptop loopback URL. `lib/database.ts` provides the actual `SqlClient` boundary, shared `searchDatabase` SQL implementation, and a `postgresAdapter` for a node-postgres-compatible Pool/Client. Wire a server-only database connection through that adapter instead of the local HTTP transport, or deploy a separately authenticated database API. Reuse the parameterized SQL and migration in `migrations/001_chunks.sql`; provide `DATABASE_URL` only in server settings. Do not expose a database administrator credential in client code or add `NEXT_PUBLIC_` to it.

1. Create/choose the authorized Supabase project tomorrow; obtain its PostgreSQL connection URL.
2. Enable pgvector and apply `migrations/001_chunks.sql` to an isolated project schema/database.
3. Ingest the committed chunks using the same pinned MiniLM vectors; compare row count, corpus hash, dimensionality, and representative vector/full-text results with local evidence.
4. Keep ingestion as a local/admin operation. Do not publish the current unauthenticated loopback `/ingest` endpoint to the Internet.
5. Use a bounded server-side query adapter and database connection pooling appropriate for the selected host. PGlite's filesystem directory is a local development implementation, not a deployable Supabase replacement.

## Build and environment

Local build: `pnpm install --frozen-lockfile`, `pnpm build`. Local start: `pnpm start`. Local data owner: `pnpm data`. Next currently binds `127.0.0.1:3300`; hosting supplies its own bind/port contract.

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATA_SERVICE_URL` | Current private local data transport | `http://127.0.0.1:3301` |
| `RAG_API_URL` | MCP client's retrieval endpoint | `http://127.0.0.1:3300` |
| `MODEL_CACHE_DIR` | Writable pinned-model cache directory | `.cache/transformers` under the app |
| `DATABASE_URL` | Future server-only PostgreSQL adapter | Not used until adapter is wired and verified |
| Hosted chat key/model settings | Future answer generation provider only | None required for retrieval |

## Hosted acceptance checklist

- Build from a clean Linux dependency installation and prove a cold and warm query embedding in the actual hosted Next route.
- Verify that the model revision, normalization, dimension and corpus hash match tonight's final retrieval evaluation. Retrieval results should remain comparable; rerun as a new verification artifact if the database/query code changes.
- Confirm database persistence, vector/full-text parity and private credentials.
- Apply a persistent public request quota and bounded input/output/concurrency before exposing expensive inference; the loopback demonstration does not implement a public quota.
- Configure the chosen hosted chat model separately. Measure grounded-answer/citation coverage and latency anew; do not relabel retrieval hit@5 as generation accuracy.
- Repeat browser keyboard/accessibility checks and public source links. Replace localhost portfolio/demo links with verified public URLs.
- Run both MCP tools against the hosted API, then capture a real Codex/Claude conversation using them. Stdio remains a locally spawned server; it is not an HTTP deployment endpoint.

The final retrieval measurements are in `evidence/retrieval-eval.json`; preserve them as the local reference. Do not overwrite their model/corpus metadata or claim a hosted result before checking it.

## Local answer-generation implementation

`app/api/answer/route.ts` currently uses the local Ollama `/api/chat` endpoint and the existing `qwen2.5-coder:7b`; it never changes the embedder. Replace only that answer-provider transport tomorrow, retain `lib/generation.ts` final validation, and run a new generation evaluation. The route emits NDJSON source, unvalidated-draft, final, and error events. It permits one active local model request, including cancellation cleanup, and uses 4096 context tokens with at most 320 generated tokens. The existing Ollama service is not owned or stopped by this project.

The structural decoder schema intentionally omits grammar-level string-length bounds because the current local runner stopped with the full Zod schema. Strict final Zod bounds, source-ID membership and exact quote checks remain active. Hosted model support for its chosen structured-output API must be verified independently.
