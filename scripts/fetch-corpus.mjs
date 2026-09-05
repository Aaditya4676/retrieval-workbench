import { mkdir, writeFile } from "node:fs/promises";
const sources = [
  {
    repo: "pmndrs/zustand",
    revision: "b57db4f86ef179285da216eeb291266da82c361c",
    prefix: "zustand",
    files: [
      "README.md",
      "docs/learn/guides/immutable-state-and-merging.md",
      "docs/learn/guides/updating-state.md",
      "docs/learn/guides/prevent-rerenders-with-use-shallow.md",
      "docs/reference/integrations/persisting-store-data.md",
    ],
  },
  {
    repo: "TanStack/query",
    revision: "1893a965d219032207cbe147880d0e9f757a5a56",
    prefix: "query",
    files: [
      "docs/framework/react/guides/important-defaults.md",
      "docs/framework/react/guides/query-invalidation.md",
      "docs/framework/react/guides/paginated-queries.md",
      "docs/framework/react/guides/query-keys.md",
      "docs/framework/react/guides/optimistic-updates.md",
    ],
  },
];
await mkdir("corpus/raw", { recursive: true });
await mkdir("corpus/licenses", { recursive: true });
const manifest = [];
for (const source of sources) {
  for (const file of [...source.files, "LICENSE"]) {
    const url = `https://raw.githubusercontent.com/${source.repo}/${source.revision}/${file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    const text = await response.text();
    const id = `${source.prefix}-${file.split("/").at(-1).replace(".md", "").toLowerCase()}`;
    const destination =
      file === "LICENSE"
        ? `corpus/licenses/${source.prefix}-LICENSE.txt`
        : `corpus/raw/${id}.md`;
    await writeFile(destination, text);
    if (file !== "LICENSE")
      manifest.push({
        id,
        file: destination,
        source: `https://github.com/${source.repo}/blob/${source.revision}/${file}`,
        revision: source.revision,
        license: "MIT",
      });
  }
}
await writeFile(
  "corpus/sources.json",
  JSON.stringify(
    { downloadedAt: new Date().toISOString(), sources: manifest },
    null,
    2,
  ),
);
console.log(
  `Saved ${manifest.length} source documents with pinned commits and MIT licenses.`,
);
