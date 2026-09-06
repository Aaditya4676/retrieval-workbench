import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";

const directory = "Z:/STUDY/res/Portfolio/work/review/after2/rag";
await mkdir(directory, { recursive: true });
const retained = JSON.parse(
  await readFile(
    new URL("../evidence/generation-route-proof.json", import.meta.url),
    "utf8",
  ),
);
const sourceEvent = retained.events.find((event) => event.type === "sources");
const draftEvent = retained.events.find((event) => event.type === "draft");
const finalEvent = retained.events.find((event) => event.type === "final");
assert.ok(
  finalEvent.citations.every((citation) =>
    sourceEvent.results.some(
      (source) =>
        source.id === citation.chunkId && source.text.includes(citation.quote),
    ),
  ),
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const proof = {
  item: 17,
  at: new Date().toISOString(),
  method:
    "UI presentation probe: retained real generation-route-proof events are emitted through a controlled browser ReadableStream; no new inference is claimed.",
  states: [],
};
try {
  for (const colorScheme of ["light", "dark"])
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const context = await browser.newContext({
        reducedMotion,
        colorScheme,
        viewport: { width: 1280, height: 900 },
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => {
        const nativeFetch = window.fetch.bind(window);
        window.fetch = (input, init) => {
          if (input !== "/api/answer") return nativeFetch(input, init);
          return Promise.resolve(
            new Response(
              new ReadableStream({
                start(controller) {
                  window.__motionStream = controller;
                },
              }),
              { headers: { "Content-Type": "application/x-ndjson" } },
            ),
          );
        };
        window.__emitMotionEvent = (event) =>
          window.__motionStream.enqueue(
            new TextEncoder().encode(JSON.stringify(event) + "\n"),
          );
      });
      await page.goto("http://127.0.0.1:3300", { waitUntil: "networkidle" });
      await page.getByLabel("Your question").fill(retained.query);
      await page
        .getByRole("button", { name: "Draft an answer", exact: true })
        .click();
      await page.waitForFunction(() => Boolean(window.__motionStream));
      await page.evaluate(
        (events) => events.forEach(window.__emitMotionEvent),
        [sourceEvent, draftEvent],
      );
      await page.getByText("Unvalidated draft", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: /Inspect cited passage/ })
          .count(),
        0,
      );
      const draft = await page.locator(".answer-draft").evaluate((element) => ({
        duration: getComputedStyle(element).animationDuration,
        name: getComputedStyle(element).animationName,
        inert: element.inert,
        hidden: element.getAttribute("aria-hidden"),
      }));
      assert.equal(draft.duration, reducedMotion === "reduce" ? "0s" : "0.14s");
      assert.equal(draft.inert, false);
      const overlap = await page.evaluate(async (event) => {
        window.__emitMotionEvent(event);
        window.__motionStream.close();
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const outgoing = document.querySelector(".answer-draft");
        const final = document.querySelector(".answer-final");
        const animations = document
          .querySelector(".answer-stack")
          .getAnimations({ subtree: true });
        for (const animation of animations) {
          const duration = Number(animation.effect.getTiming().duration);
          if (duration > 0) {
            animation.pause();
            animation.currentTime = duration / 2;
          }
        }
        return {
          layers: document.querySelectorAll(".answer-stack > .answer-copy")
            .length,
          draft: outgoing
            ? {
                opacity: Number(getComputedStyle(outgoing).opacity),
                inert: outgoing.inert,
                ariaHidden: outgoing.getAttribute("aria-hidden"),
                duration: getComputedStyle(outgoing).animationDuration,
                top: outgoing.getBoundingClientRect().top,
                buttons: outgoing.querySelectorAll("button,a,input").length,
              }
            : null,
          final: {
            opacity: Number(getComputedStyle(final).opacity),
            duration: getComputedStyle(final).animationDuration,
            top: final.getBoundingClientRect().top,
            citationDuration: getComputedStyle(final.querySelector("button"))
              .animationDuration,
            buttons: final.querySelectorAll("button").length,
          },
          nativeAnimations: animations.map((animation) => ({
            name: animation.animationName,
            duration: animation.effect.getTiming().duration,
          })),
        };
      }, finalEvent);
      assert.equal(overlap.final.buttons, finalEvent.citations.length);
      assert.equal(
        overlap.final.citationDuration,
        reducedMotion === "reduce" ? "0s" : "0.14s",
      );
      if (reducedMotion === "no-preference") {
        assert.equal(overlap.layers, 2);
        assert.equal(overlap.draft.inert, true);
        assert.equal(overlap.draft.ariaHidden, "true");
        assert.equal(overlap.draft.buttons, 0);
        assert.equal(overlap.draft.top, overlap.final.top);
        assert.ok(overlap.draft.opacity > 0 && overlap.draft.opacity < 1);
        assert.ok(overlap.final.opacity > 0 && overlap.final.opacity < 1);
        assert.equal(overlap.final.duration, "0.2s");
        await page.evaluate(() =>
          document
            .querySelector(".answer-stack")
            .getAnimations({ subtree: true })
            .forEach((animation) => animation.finish()),
        );
      } else {
        if (overlap.draft) {
          assert.equal(overlap.draft.opacity, 0);
          assert.equal(overlap.draft.inert, true);
          assert.equal(overlap.draft.ariaHidden, "true");
          assert.equal(overlap.draft.duration, "0s");
        }
        assert.equal(overlap.final.duration, "0s");
        assert.equal(overlap.final.opacity, 1);
      }
      await page.waitForFunction(
        () => !document.querySelector(".answer-draft"),
      );
      await page
        .getByRole("button", { name: "Inspect cited passage 1", exact: true })
        .click();
      assert.ok(
        (await page.locator(".source-text").textContent()).includes(
          finalEvent.citations[0].quote,
        ),
      );
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      assert.deepEqual(axe.violations, []);
      assert.deepEqual(errors, []);
      proof.states.push({
        colorScheme,
        reducedMotion,
        draft,
        overlap,
        outgoingRemoved: true,
        finalCitationInspectsExactSource: true,
        axeViolations: axe.violations.length,
        pageErrors: errors,
      });
      await context.close();
    }
} finally {
  await browser.close();
}
await writeFile(
  `${directory}/item17-motion.json`,
  JSON.stringify(proof, null, 2),
);
console.log(JSON.stringify(proof, null, 2));
