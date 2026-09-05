# Retrieval workbench

## The problem

A document chatbot can sound convincing while its search never retrieves the passage needed to answer the question. I wanted a frontend engineer's view into that failure: one interface to compare the evidence, with the same search exposed to automated evaluations and coding tools.

## What I built

A Next.js and TypeScript workbench over ten MIT-licensed Zustand and TanStack Query documents. Heading-aware chunks respect the shipped MiniLM model's context limit: at most 220 wordpieces including the heading and special tokens, with a 20-word overlap. The 132 chunks have content-derived IDs, source commit URLs, and a corpus hash.

The app's production Node route executes real quantized `Xenova/all-MiniLM-L6-v2` query inference. PGlite owns a filesystem-persisted PostgreSQL database with pgvector and full-text search. The browser, evaluation script, and two MCP stdio tools share that production API. Selecting a result shows its exact committed passage and original source.

## The result

On 18 answerable questions fixed before ranked tests, vector and hybrid search each found a labeled passage in their first five results for 15 questions (83.3%); keyword search did so for 8 (44.4%). Hybrid's MRR@5 was 0.6435, compared with vector's 0.6157 and keyword's 0.4167. These are 60 serial production API requests over twenty development questions, including two unsupported controls, on an Intel i5-11400H Windows laptop with 24 GB RAM on 6 September 2026.

The limitation is as informative as the score: complete coverage on the two questions requiring two sources was 0/2 for every method. Vector and hybrid returned related passages for both unsupported controls. I kept those failures and the original labels in the report. This is locally verified retrieval and MCP tooling; it is not a claim about generated-answer accuracy or a deployed service.

## Decisions that mattered

- **Prove the deployed code path locally.** The production Next route computes the query vector itself; a separate embedding script passing would not establish that native ONNX execution was packaged correctly in the application.
- **Keep the database owner singular.** A loopback PGlite service holds the database directory while the app and tools make requests. SQL uses PostgreSQL full-text and pgvector; tomorrow's Supabase connection still needs hosted validation.
- **Combine ranks, not incompatible scores.** RRF uses rank positions from keyword and cosine-distance lists. Hybrid can still miss necessary evidence; the interface and labels make that visible.

## What I learned

Hit@5 can look encouraging while a two-source answer is impossible from the retrieved context. Measuring at least one expected hit and every required source separately exposed that gap. I also found that a small embedding model's context budget should determine chunk size: blindly using 400–600-token chunks would truncate useful text here.

## Evidence and next step

Local demo: http://127.0.0.1:3300. Evidence lives in `evidence/retrieval-eval.json`, `evidence/production-route-proof.json`, `evidence/mcp-client.json`, and the two screenshot/audit passes. All final retrieval requests use the same Next production route. Public demo/source links, Supabase, hosted chat generation evaluation, and a Codex/Claude conversational demonstration remain tomorrow's checks.

Before extending this project, I would create a held-out multi-source set and compare a bounded query-decomposition approach. I would keep the permanent MiniLM embedder and separately measure generated citations once a hosted answer model is selected.

## Optional generation, measured separately

The local app also uses the already installed Ollama `qwen2.5-coder:7b` for answer generation only. A production request about nested Zustand updates produced a real draft followed by two exact source citations from separate documents in 36.9 seconds. The UI explicitly labels the draft as unvalidated until the final schema and source-quote checks finish. Those checks verify citation mechanics, not whether every claim follows from the evidence.

I encountered a concrete runtime issue: the full length-constrained decoder schema stopped the local runner, while a structural decoder schema succeeded with the same context. I retained all length and citation validation in the application and preserved the failed probe.

The separate local generation pass completed all sixty application requests. Expected-source citation coverage was 7/18 with keyword retrieval and 12/18 with vector or hybrid; complete two-source coverage remained 0/2. Seven of 48 outputs observed at citation validation failed source-ID or exact-quote checks and were withheld; twelve keyword requests had no passages and skipped the answer model. Both unsupported controls received no-citation responses in each mode. These are mechanical citation measures on a small development set, not generated-answer accuracy. The raw events, exact Ollama model digest, quantization and laptop hardware are recorded in `evidence/generation-eval.json`. Tomorrow's hosted answer model requires a new generation evaluation while the permanent MiniLM retrieval reference remains unchanged.
