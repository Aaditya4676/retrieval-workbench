import Workbench from "./workbench";
import manifest from "@/corpus/manifest.json";
import evaluation from "@/evals/results.json";
export const dynamic = "force-dynamic";
// Answer generation needs a reachable model endpoint. Without one the button
// could only ever fail, so the panel is hidden rather than shown broken.
const generationEnabled = Boolean(process.env.ANSWER_BASE_URL);
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <Workbench
      count={manifest.chunks}
      generationEnabled={generationEnabled}
      evaluation={evaluation.summary}
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
