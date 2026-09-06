import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const directory = "Z:/STUDY/res/Portfolio/work/review/after2/rag";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const query = "Zustand partialize gcTime";
const proof = {
  item: 18,
  at: new Date().toISOString(),
  method:
    "Real production search requests and keyboard activation; no mocked API responses.",
  states: [],
};
try {
  for (const colorScheme of ["light", "dark"]) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const requests = [];
    const errors = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/api/search"))
        requests.push(request.postDataJSON());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:3300", { waitUntil: "networkidle" });
    await page.getByLabel("Your question").fill(query);
    await page.getByLabel("Retrieval method").selectOption("keyword");
    const keywordResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/search"),
    );
    await page
      .getByRole("button", { name: "Search passages", exact: true })
      .click();
    const keyword = await (await keywordResponse).json();
    assert.equal(keyword.mode, "keyword");
    assert.deepEqual(keyword.results, []);
    const recovery = page.getByRole("button", {
      name: "Search with vector instead",
      exact: true,
    });
    await recovery.waitFor();
    for (let tab = 0; tab < 20; tab++) {
      await page.keyboard.press("Tab");
      if (
        await recovery.evaluate((element) => document.activeElement === element)
      )
        break;
    }
    assert.equal(
      await recovery.evaluate((element) => document.activeElement === element),
      true,
    );
    assert.equal(
      await recovery.evaluate((element) => element.matches(":focus-visible")),
      true,
    );
    const vectorResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/search"),
    );
    await page.keyboard.press("Enter");
    const vector = await (await vectorResponse).json();
    await page.locator(".library-chip").first().waitFor();
    assert.equal(vector.mode, "vector");
    assert.equal(vector.embedding.execution, "next-route-handler");
    assert.ok(vector.results.length);
    assert.equal(await page.getByLabel("Your question").inputValue(), query);
    assert.equal(
      await page.getByLabel("Retrieval method").inputValue(),
      "vector",
    );
    const url = new URL(page.url());
    assert.equal(url.searchParams.get("q"), query);
    assert.equal(url.searchParams.get("mode"), "vector");
    assert.deepEqual(
      requests.map((request) => [request.query, request.mode]),
      [
        [query, "keyword"],
        [query, "vector"],
      ],
    );
    const chips = await page.locator(".library-chip").allTextContents();
    assert.deepEqual(
      chips,
      vector.results.map((result) =>
        result.document.startsWith("zustand") ? "Zustand" : "TanStack Query",
      ),
    );
    assert.equal(await recovery.count(), 0);
    const chipCheckQuery = "staleTime gcTime difference";
    await page.getByLabel("Your question").fill(chipCheckQuery);
    const libraryResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/search"),
    );
    await page
      .getByRole("button", { name: "Search passages", exact: true })
      .click();
    const libraryResults = await (await libraryResponse).json();
    await page
      .getByText(`Results for “${chipCheckQuery}”`, { exact: true })
      .waitFor();
    const otherChips = await page.locator(".library-chip").allTextContents();
    assert.deepEqual(
      otherChips,
      libraryResults.results.map((result) =>
        result.document.startsWith("zustand") ? "Zustand" : "TanStack Query",
      ),
    );
    assert.ok(otherChips.includes("TanStack Query"));
    await page.waitForTimeout(180);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    assert.deepEqual(axe.violations, []);
    assert.deepEqual(errors, []);
    proof.states.push({
      colorScheme,
      query,
      requests,
      keywordCount: keyword.results.length,
      vectorCount: vector.results.length,
      vectorExecution: vector.embedding.execution,
      chips,
      chipCheckQuery,
      otherChips,
      url: url.href,
      finalChipCheckUrl: page.url(),
      keyboardActivation: true,
      axeViolations: axe.violations.length,
      pageErrors: errors,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${directory}/item18-recovery.json`,
  JSON.stringify(proof, null, 2),
);
console.log(JSON.stringify(proof, null, 2));
