import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const directory = "Z:/STUDY/res/Portfolio/work/review/after2/rag";
await mkdir(directory, { recursive: true });
const fixtureResponse = await fetch("http://127.0.0.1:3300/api/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "Zustand nested objects merging set",
    mode: "hybrid",
    k: 5,
  }),
});
assert.equal(fixtureResponse.status, 200);
const fixture = await fixtureResponse.json();
assert.ok(fixture.results.length);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const proof = {
  item: 16,
  at: new Date().toISOString(),
  method:
    "A real local search response is gated and replayed to measure response timing; backend rankings are verified separately.",
  states: [],
};
try {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({
      reducedMotion,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.motionEvents = [];
      document.addEventListener("animationstart", (event) => {
        if (event.animationName === "response-arrival")
          window.motionEvents.push({
            name: event.animationName,
            tag: event.target.tagName,
            duration: getComputedStyle(event.target).animationDuration,
          });
      });
    });
    const releases = [];
    await page.route("**/api/search", async (route) => {
      await new Promise((resolve) => releases.push(resolve));
      await route.fulfill({ json: fixture });
    });
    await page.goto("http://127.0.0.1:3300", { waitUntil: "networkidle" });
    assert.equal(await page.locator(".has-response").count(), 0);
    const runs = [];
    for (let run = 0; run < 2; run++) {
      await page.evaluate(() => {
        window.previousList = document.querySelector(".result-list");
      });
      await page
        .getByRole("button", { name: "Search passages", exact: true })
        .click();
      while (releases.length <= run) await page.waitForTimeout(10);
      const pendingSameNode = await page.evaluate(
        () => window.previousList === document.querySelector(".result-list"),
      );
      assert.equal(
        pendingSameNode,
        true,
        "List should not remount while request is pending",
      );
      releases[run]();
      await page.waitForFunction(() =>
        /passages found/.test(
          document.querySelector(".status")?.textContent || "",
        ),
      );
      await page.waitForTimeout(180);
      const arrival = await page.evaluate(() => ({
        newNode: window.previousList !== document.querySelector(".result-list"),
        animation: getComputedStyle(document.querySelector(".result-list"))
          .animationName,
        duration: getComputedStyle(document.querySelector(".result-list"))
          .animationDuration,
        events: window.motionEvents.slice(),
      }));
      assert.equal(arrival.newNode, true);
      assert.equal(
        arrival.duration,
        reducedMotion === "reduce" ? "0s" : "0.14s",
      );
      assert.equal(arrival.events.length, run + 1);
      assert.ok(
        arrival.events.every((event) => event.tag === "OL"),
        "Only the list block enters",
      );
      runs.push({ pendingSameNode, ...arrival });
    }
    const before = await page
      .locator(".result-list > li")
      .first()
      .evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        duration: getComputedStyle(element).transitionDuration,
      }));
    const selection = await page
      .locator(".result-list > li")
      .first()
      .evaluate(async (element) => {
        element.querySelector(".result-footer button").click();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const animation = element
          .getAnimations()
          .find((item) => item.transitionProperty === "background-color");
        const duration = animation?.effect.getTiming().duration;
        if (animation) {
          animation.pause();
          animation.currentTime = duration / 2;
        }
        const during = getComputedStyle(element).backgroundColor;
        if (animation) animation.finish();
        return {
          during,
          after: getComputedStyle(element).backgroundColor,
          observedTransition: Boolean(animation),
          nativeDuration: duration ?? 0,
        };
      });
    const { during, after } = selection;
    assert.equal(before.duration, reducedMotion === "reduce" ? "0s" : "0.14s");
    if (reducedMotion === "reduce") assert.equal(during, after);
    else assert.notEqual(during, after);
    assert.notEqual(before.background, after);
    assert.deepEqual(errors, []);
    proof.states.push({
      reducedMotion,
      runs,
      selection: { before, ...selection },
      pageErrors: errors,
    });
    await context.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  `${directory}/item16-motion.json`,
  JSON.stringify(proof, null, 2),
);
console.log(JSON.stringify(proof, null, 2));
