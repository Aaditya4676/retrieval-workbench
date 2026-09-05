# Interface workbench

Chosen direction for Aaditya's portfolio and related tools. The alternatives and their exact token files remain in `work/design-directions/signal-room` and `work/design-directions/field-notes`. All use the same structural markup and variable names; switching a copied token file changes palette, typography, scale, density, radii, and the hero artifact's treatment.

## Decision and review

I rendered and inspected all three directions at 1280 and 390 pixels. Interface workbench is selected because it makes the React/performance subject visible without depending on terminal decoration, an oversized list of metrics, or a stock illustration. The cool light background and blue active step keep the portfolio readable alongside the denser project tools. Signal room is more expressive but its wider body face adds wrapping on mobile. Field notes is calm and useful as a morning alternative, but loses some separation between the engineering artifact and the surrounding content.

First-pass correction: the desktop Space Grotesk headline wrapped into five lines. Reducing its maximum from 76 to 64 pixels preserves the intended three-line introduction without changing the markup. The final prototype files contain the corrected tokens. No horizontal page overflow was found at either requested width; both local font files loaded. Color contrast is measured in `work/design-directions/contrast-evidence.json`.

Before final portfolio acceptance, replace the prototype's purely descriptive artifact with one bounded inspectable interaction if it helps the real site. Do not invent timings. Remove the redundant footer slogan from that artifact; the step labels already communicate the concept. The portfolio owner retains discretion to refine composition within the shared token vocabulary and must visually verify the result.

## Token contract

Canonical file: `contracts/design-tokens.css`. Each repository owns a verbatim copy, imported before component styles. Preserve the original release hash in each repo. Font assets and SIL OFL license files are in `work/design-directions/fonts` and must be copied locally; no runtime Google Fonts dependency.

Palette: surface `#edf3f6`, panel `#ffffff`, ink `#172d3d`, muted `#4c6474`, accent `#154fc4`, border `#b8cbd6`. Exactly one accent. State distinctions also use words/icons/border treatment rather than introducing more colors. Muted text is checked on both surface and panel. Use `color-control-border` for input boundaries; the lighter `color-border` is for decorative separators.

Type: Space Grotesk for headings, Source Sans 3 for body and controls. Theme roles and weights are tokenized. The base scale runs from 13px metadata to a fluid 44–64px hero, with the complete scale in the CSS file. Use normal mixed-case labels, no monospace small text. Font-face declarations describe bundled assets; component typography always consumes variables.

Every color, font family/size/weight/line-height/tracking, spacing value and radius in components/styles must reference the token file. Numeric content coordinates (canvas positions), grid fractions, and CSS structural keywords are data/structure, not theme values. Media thresholds, if needed, should be generated from named configuration in the token source; prefer intrinsically responsive wrapping/grid without hardcoded breakpoints. Do not use framework-default spacing/color/radius utilities that bypass this contract. Ask the coordinator for missing semantic keys; do not fork the palette locally.

Spacing: quarter-rem scale through 8rem, fluid page gutters and hero/section spacing. Radii: 4px controls, 10px grouped internal content, 18px hero artifact; no radius applied indiscriminately. Sizes, focus widths, borders, control heights, reading widths, and project-tool dimensions are also included. Motion: one user-triggered hero interaction at most; other motion answers an action. Honor reduced motion. Keep project tools unrotated and dense, with no hero treatment.

## Layout

Left-aligned introduction and selected work, with the one expressive browser-update artifact alongside the introduction and a natural single-column flow on narrow screens.

```text
Name / frontend engineer                       Work / contact

I build interfaces.                 Under the interface
And what makes                      Input
them work.                            Render
                                       Paint
Brief context + explore work

Selected work with direct local demo / case-study links
Project investigations weighted by content, not identical cards
Experience                                      Contact / resume
```

## Principles

- Make the work inspectable: visible demos, decisions, and source status.
- Let React performance and systems behavior shape the content; avoid generic SaaS promises.
- Prefer three concrete investigations over a wall of technology badges.
- Keep experience factual and project measurements traceable to evidence.
- The same readable controls must work in the portfolio, canvas and retrieval tool.

## Banned defaults from the brief

- Cream background + high-contrast serif + terracotta/clay accent; near-black + a single acid-green or vermilion accent; violet gradients; Inter everywhere.
- The SaaS card kit: content chopped into identical rounded cards, one radius on everything, the same soft grey shadow under each, gradient washes as decoration, glassmorphism.
- Template chrome: tracked-out ALL-CAPS eyebrow labels above headings, meta strings joined with middle dots, monospace for small labels, arrows appended to links and buttons, a single accented word in a headline.
- Numbered markers on content that is not actually a sequence.
- Fade-and-slide-up entrances on every section and hover lifts on every card. One deliberate moment on the portfolio; motion that answers a user action elsewhere.
- Big-number-with-small-label hero stats.
- Lorem ipsum, emoji as icons, stock illustration.

## Morning switch

Replace each app's copied token file with the complete `tokens.css` from the desired direction. Both bundled font families remain available, so the switch needs no font dependency or component changes. Rebuild and rerun the existing screenshot checks at all three widths. The coordinator supplies a root switch script after the apps settle. This changes visual treatment, not application content or behavior.
