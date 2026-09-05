import Workbench from "./workbench";
import manifest from "@/corpus/manifest.json";
import fs from "node:fs";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const evaluation = fs.existsSync("evals/results.json")
    ? JSON.parse(fs.readFileSync("evals/results.json", "utf8"))
    : null;
  return (
    <Workbench
      count={manifest.chunks}
      evaluation={evaluation?.summary ?? []}
      initialQuery={
        typeof params.q === "string" ? params.q.slice(0, 800) : undefined
      }
      initialMode={
        typeof params.mode === "string" &&
        ["keyword", "vector", "hybrid"].includes(params.mode)
          ? params.mode
          : "hybrid"
      }
    />
  );
}
