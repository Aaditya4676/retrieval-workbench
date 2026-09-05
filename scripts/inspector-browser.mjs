import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
const log = await readFile("evidence/inspector-server.log", "utf8");
const url = log.match(/http:\/\/127\.0\.0\.1:3310\?[^\s]+/)[0];
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const connection = page.getByRole("switch", {
    name: 'Connect or disconnect "retrieval-workbench"',
  });
  await connection.waitFor();
  await connection.focus();
  await page.keyboard.press("Space");
  await page
    .getByText("Connected", { exact: true })
    .waitFor({ timeout: 20000 });
  await page.getByText("Tools", { exact: true }).click();
  await page.getByRole("button", { name: "search_docs", exact: true }).click();
  await page.getByLabel(/^query/).fill("Zustand nested objects merging set");
  await page.getByRole("button", { name: "Execute Tool", exact: true }).click();
  await page
    .getByText("zustand-immutable-state-and-merging-nested-objects-831679d7", {
      exact: false,
    })
    .first()
    .waitFor({ timeout: 20000 });
  await page.screenshot({
    path: "evidence/screenshots/mcp-inspector-search.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Close results", exact: true })
    .click();
  await page.getByRole("button", { name: "get_chunk", exact: true }).click();
  await page
    .getByLabel(/^id/)
    .fill("zustand-immutable-state-and-merging-nested-objects-831679d7");
  await page.getByRole("button", { name: "Execute Tool", exact: true }).click();
  await page
    .getByText("function merges state at only one level.", { exact: false })
    .first()
    .waitFor({ timeout: 20000 });
  await page.screenshot({
    path: "evidence/screenshots/mcp-inspector-chunk.png",
    fullPage: true,
  });
  await writeFile(
    "evidence/inspector-browser.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        client: "MCP Inspector 2.5.0 web UI",
        passed: ["initialize", "tools/list", "search_docs", "get_chunk"],
        transport: "stdio",
        screenshots: [
          "screenshots/mcp-inspector-search.png",
          "screenshots/mcp-inspector-chunk.png",
        ],
        note: "Real Inspector client, not a Codex or Claude conversational demonstration.",
      },
      null,
      2,
    ),
  );
  await page
    .getByRole("button", { name: "Disconnect from server", exact: true })
    .click();
  console.log(
    "Inspector web client initialize/list/search/get_chunk verified and screenshots saved.",
  );
} finally {
  await browser.close();
}
