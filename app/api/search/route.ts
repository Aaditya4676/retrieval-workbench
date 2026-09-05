import { NextResponse } from "next/server";
import { embedding, MODEL } from "@/lib/model";
import { searchInput, type Result } from "@/lib/types";
import { dataRequest } from "@/lib/data-client";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const parsed = searchInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Enter a query of 2–800 characters, a supported mode, and k between 1 and 10.",
      },
      { status: 400 },
    );
  const started = performance.now();
  try {
    const query = parsed.data;
    const embedded =
      query.mode === "keyword" ? null : await embedding(query.query);
    const result = await dataRequest<{ results: Result[]; count: number }>(
      "/search",
      { ...query, vector: embedded?.vector },
    );
    return NextResponse.json({
      ...result,
      mode: query.mode,
      query: query.query,
      elapsedMs: performance.now() - started,
      embedding: embedded && {
        ...MODEL,
        execution: "next-route-handler",
        environment: process.env.NODE_ENV,
        processId: process.pid,
        tokenCount: embedded.tokenCount,
        elapsedMs: embedded.elapsedMs,
        invocation: embedded.invocation,
        vectorDimensions: embedded.vector.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Search failed. Check local server logs.",
      },
      { status: 503 },
    );
  }
}
