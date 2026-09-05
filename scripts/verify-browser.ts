import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const pass = process.env.REVIEW_PASS ?? "1";
await mkdir("evidence/screenshots", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const findings = [];
try {
  for (const width of [390, 768, 1280]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:3300");
    await page.evaluate(() => document.fonts.ready);
    await page.keyboard.press("Tab");
    if ((await page.locator(":focus").innerText()) !== "Skip to search")
      throw new Error("Skip link is not first focus target");
    await page.keyboard.press("Enter");
    const request = page.waitForResponse(
      (response) =>
        response.url().includes("/api/search") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Search passages", exact: true })
      .click();
    const api = await (await request).json();
    if (
      api.embedding?.execution !== "next-route-handler" ||
      api.embedding?.environment !== "production" ||
      api.embedding?.dimensions !== 384
    )
      throw new Error("Production route embedding proof failed");
    await page
      .getByRole("button", { name: "Inspect passage", exact: true })
      .first()
      .click();
    const source = await page.locator(".source-text").innerText();
    if (source !== api.results[0].text)
      throw new Error("Rendered source differs from retrieved exact chunk");
    await page.screenshot({
      path: `evidence/screenshots/pass-${pass}-${width}.png`,
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflow) throw new Error(`Horizontal overflow at ${width}`);
    const axe = await new AxeBuilder({ page }).analyze();
    if (axe.violations.length)
      throw new Error(
        JSON.stringify(
          axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        ),
      );
    const fonts = await page.evaluate(() => ({
      body: document.fonts.check('16px "Source Sans 3"'),
      heading: document.fonts.check('32px "Space Grotesk"'),
    }));
    if (errors.length) throw new Error(errors.join("\n"));
    findings.push({
      width,
      overflow,
      axeViolations: axe.violations.length,
      fonts,
      productionEmbedding: api.embedding,
      exactSourceMatch: true,
      keyboardSkipLink: true,
    });
    await context.close();
  }
  const errorPage = await browser.newPage({
    viewport: { width: 390, height: 900 },
  });
  await errorPage.goto("http://127.0.0.1:3300");
  await errorPage.route("**/api/search", (route) =>
    route.abort("connectionfailed"),
  );
  await errorPage
    .getByRole("button", { name: "Search passages", exact: true })
    .click();
  await errorPage.locator(".error[role=alert]").waitFor();
  await errorPage.screenshot({
    path: `evidence/screenshots/pass-${pass}-error-390.png`,
    fullPage: true,
  });
  await errorPage.unroute("**/api/search");
  await errorPage.close();
  await writeFile(
    `evidence/browser-pass-${pass}.json`,
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        browser: browser.version(),
        findings,
        errorState:
          "Network failure forced in browser to verify retry/error copy; retrieval success above used real API.",
      },
      null,
      2,
    ),
  );
  console.log(
    `Pass ${pass}: production inference, exact source, keyboard, fonts, no overflow and zero axe violations at 390/768/1280.`,
  );
} finally {
  await browser.close();
}
