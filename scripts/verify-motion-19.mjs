import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const directory = "Z:/STUDY/res/Portfolio/work/review/after2/rag/item19";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const proof = {
  item: 19,
  at: new Date().toISOString(),
  method:
    "Verification of existing UI, with no application source changes for this item.",
  states: [],
};
try {
  for (const colorScheme of ["light", "dark"])
    for (const width of [390, 768, 1280]) {
      const context = await browser.newContext({
        colorScheme,
        viewport: { width, height: width === 390 ? 844 : 900 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("http://127.0.0.1:3300", { waitUntil: "networkidle" });
      const link = page.getByRole("link", {
        name: "How it works",
        exact: true,
      });
      const label = await link.textContent();
      assert.equal(await link.getAttribute("href"), "#method");
      assert.equal(await page.locator("#method h2").textContent(), label);
      for (let tab = 0; tab < 12; tab++) {
        await page.keyboard.press("Tab");
        if (
          await link.evaluate((element) => document.activeElement === element)
        )
          break;
      }
      assert.equal(
        await link.evaluate(
          (element) =>
            document.activeElement === element &&
            element.matches(":focus-visible"),
        ),
        true,
      );
      await page.keyboard.press("Enter");
      assert.equal(new URL(page.url()).hash, "#method");
      const markers = await page
        .locator("#method li")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            text: element.textContent.trim(),
            marker: getComputedStyle(element).listStyleType,
            display: getComputedStyle(element).display,
            width: element.getBoundingClientRect().width,
          })),
        );
      assert.equal(markers.length, 3);
      assert.ok(
        markers.every(
          (marker) =>
            marker.marker === "disc" &&
            marker.display === "list-item" &&
            marker.width > 0,
        ),
      );
      await page.evaluate(() => document.fonts.ready);
      const image = `${directory}/method-${colorScheme}-${width}.png`;
      await page.locator("#method").screenshot({ path: image });
      assert.deepEqual(errors, []);
      proof.states.push({
        colorScheme,
        width,
        label,
        destination: new URL(page.url()).hash,
        keyboardActivation: true,
        markers,
        image,
        pageErrors: errors,
      });
      await context.close();
    }
} finally {
  await browser.close();
}
await writeFile(`${directory}/proof.json`, JSON.stringify(proof, null, 2));
console.log(JSON.stringify(proof, null, 2));
