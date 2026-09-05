import { NextResponse } from "next/server";
import { searchInput } from "@/lib/types";
import { search } from "@/lib/search";
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
  try {
    return NextResponse.json(await search(parsed.data));
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
