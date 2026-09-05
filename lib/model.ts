import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import path from "node:path";

export const MODEL = {
  id: "Xenova/all-MiniLM-L6-v2",
  revision: "751bff37182d3f1213fa05d7196b954e230abad9",
  dimensions: 384,
  dtype: "q8",
  pooling: "mean",
  normalize: true,
  maxTokens: 256,
} as const;
env.cacheDir =
  process.env.MODEL_CACHE_DIR ??
  path.join(process.cwd(), ".cache", "transformers");
let extractor: Promise<FeatureExtractionPipeline> | undefined;
let calls = 0;
export async function embedding(
  text: string,
): Promise<{
  vector: number[];
  tokenCount: number;
  elapsedMs: number;
  invocation: number;
}> {
  const started = performance.now();
  // Reuse one native ONNX session in the Next process, never delegate query embedding to the database.
  extractor ??= (
    pipeline("feature-extraction", MODEL.id, {
      revision: MODEL.revision,
      dtype: MODEL.dtype,
      device: "cpu",
    }) as Promise<FeatureExtractionPipeline>
  ).catch((error) => {
    extractor = undefined;
    throw error;
  });
  const model = await extractor;
  const tokens = model.tokenizer(text, { truncation: false });
  const tokenCount = tokens.input_ids.size;
  if (tokenCount > MODEL.maxTokens)
    throw new Error(
      `Input has ${tokenCount} tokens; maximum is ${MODEL.maxTokens}. Shorten your query.`,
    );
  const output = await model(text, {
    pooling: MODEL.pooling,
    normalize: MODEL.normalize,
  });
  const vector = Array.from(output.data as Float32Array);
  if (
    vector.length !== MODEL.dimensions ||
    vector.some((v) => !Number.isFinite(v))
  )
    throw new Error("Invalid embedding output");
  return {
    vector,
    tokenCount,
    elapsedMs: performance.now() - started,
    invocation: ++calls,
  };
}
