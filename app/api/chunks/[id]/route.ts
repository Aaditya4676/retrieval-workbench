import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { sqlStatements } from "@/lib/database";
import type { Chunk } from "@/lib/types";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[a-z0-9-]+$/.test(id) || id.length > 200)
    return NextResponse.json({ error: "Invalid chunk ID" }, { status: 400 });
  try {
    const result = await getDatabase().query<Chunk>(sqlStatements.chunk, [id]);
    return result.rows.length
      ? NextResponse.json(result.rows[0])
      : NextResponse.json({ error: "Unknown chunk" }, { status: 404 });
  } catch {
    return NextResponse.json(
      { error: "Chunk unavailable. Check the database connection and retry." },
      { status: 503 },
    );
  }
}
