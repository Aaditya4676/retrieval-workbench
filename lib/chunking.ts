import { createHash } from "node:crypto";
export function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function sections(
  markdown: string,
): { heading: string; text: string }[] {
  const clean = markdown
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  const output: { heading: string; text: string }[] = [];
  let heading = "Overview";
  let lines: string[] = [];
  for (const line of clean.split("\n")) {
    if (/^#{1,6}\s/.test(line)) {
      if (lines.join("\n").trim())
        output.push({ heading, text: lines.join("\n").trim() });
      heading = line.replace(/^#+\s*/, "").replace(/`/g, "");
      lines = [];
    } else lines.push(line);
  }
  if (lines.join("\n").trim())
    output.push({ heading, text: lines.join("\n").trim() });
  return output;
}
export function stableId(document: string, heading: string, text: string) {
  return `${document}-${slug(heading)}-${createHash("sha256").update(text).digest("hex").slice(0, 8)}`;
}
