import { chromium } from "playwright";
import { mkdir, rename, writeFile } from "node:fs/promises";
await mkdir("evidence/videos", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: "evidence/videos", size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
const started = Date.now();
try {
  await page.goto("http://127.0.0.1:3300");
  await page.waitForTimeout(7000);
  await page
    .getByRole("button", { name: "Search passages", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect passage", exact: true })
    .first()
    .waitFor();
  await page.waitForTimeout(5000);
  await page
    .getByRole("button", { name: "Inspect passage", exact: true })
    .first()
    .click();
  await page.waitForTimeout(9000);
  await page
    .getByText("Inspect query embedding execution", { exact: true })
    .click();
  await page.locator(".execution").scrollIntoViewIfNeeded();
  await page.waitForTimeout(8000);
  await page
    .getByLabel("Your question", { exact: true })
    .fill("Zustand nested objects merging set");
  await page
    .getByLabel("Retrieval method", { exact: true })
    .selectOption("keyword");
  await page
    .getByRole("button", { name: "Search passages", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect passage", exact: true })
    .first()
    .waitFor();
  await page
    .getByRole("button", { name: "Inspect passage", exact: true })
    .first()
    .click();
  await page.waitForTimeout(8000);
  await page.locator("#evaluation").scrollIntoViewIfNeeded();
  await page.waitForTimeout(13000);
  await page.locator("#method").scrollIntoViewIfNeeded();
  await page.waitForTimeout(7000);
  const video = page.video();
  await context.close();
  const original = await video!.path();
  await rename(original, "evidence/demo.webm");
  await writeFile(
    "evidence/recording.json",
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        elapsedSeconds: (Date.now() - started) / 1000,
        path: "demo.webm",
        browser: browser.version(),
        scope:
          "Actual production browser retrieval, source inspection, execution metadata and final eval table. No generated answer or conversational MCP claim.",
      },
      null,
      2,
    ),
  );
  console.log("Saved real local browser recording to evidence/demo.webm.");
} finally {
  await browser.close();
}
