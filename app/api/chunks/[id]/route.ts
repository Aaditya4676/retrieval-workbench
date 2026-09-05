import { NextResponse } from "next/server";
import { dataRequest } from "@/lib/data-client";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[a-z0-9-]+$/.test(id) || id.length > 200)
    return NextResponse.json({ error: "Invalid chunk ID" }, { status: 400 });
  try {
    return NextResponse.json(await dataRequest(`/chunks/${id}`));
  } catch {
    return NextResponse.json(
      { error: "Chunk unavailable. Check its ID and the data service." },
      { status: 404 },
    );
  }
}
