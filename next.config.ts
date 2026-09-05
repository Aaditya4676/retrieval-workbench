import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
  ],
  experimental: { cpus: 2 },
  poweredByHeader: false,
};
export default config;
