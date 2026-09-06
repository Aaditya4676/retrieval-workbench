import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "sharp",
  ],
  experimental: { cpus: 2 },
  poweredByHeader: false,
  // The root layout reads the token file at request time to derive the browser
  // theme colors. A dynamic read is invisible to output tracing, so the file has
  // to be declared or the serverless bundle omits it and every render throws.
  outputFileTracingIncludes: {
    "/**": ["./app/design-tokens.css"],
  },
};
export default config;
