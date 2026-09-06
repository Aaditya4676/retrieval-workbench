# Research reading desk

The RAG workbench now has an independent identity: Literata for headings and exact-source reading, Source Sans 3 for controls and measurements, neutral white/lilac paper with a muted plum accent. The selected passage is the main reading surface; ranked passages are the adjacent index. This is distinct from the portfolio, canvas and federation tools.

The compact plan and its review were written before implementation in `work/redesign/rag/PLAN.md` at the Portfolio root. The original shared Interface workbench contract and three-direction screenshots remain historical evidence; replacing this app's new token source with that old contract is no longer the redesign workflow.

## Typography and source

Literata's variable Latin WOFF2 is self-hosted at `public/fonts/literata-latin.woff2`, obtained from the official Google Fonts CSS service and fonts.gstatic.com. It covers normal weights 200–900, with optical sizing. Its SIL OFL notice is retained as `literata-OFL.txt`. Source Sans 3 and its existing license remain local. No runtime font request goes to Google.

The serif title is intentionally restrained. Exact passages receive a bounded reading measure and more line height; operating controls, chunk IDs and numeric comparisons remain sans serif. The original source text is unchanged and rendered as plain text.

## Token source and system dark mode

`app/design-tokens.css` is now owned by this application. Theme colors, dimensions, font roles, scale, weights, tracking, line heights, radii, focus, opacity and durations all come from it. Font-face declarations describe the asset itself; component styles consume token roles.

The light desk is `#f7f5fa`, paper `#ffffff`, lilac wash `#f0ebf4`, ink `#29252f`, muted text `#66616f` and plum `#694f77`. The system dark desk is `#201d24`, paper `#28242e`, raised surface `#322b39`, ink `#f1edf5`, muted text `#b9b0c4` and plum `#d6bce9`. Borders, selected results, errors and focus use explicit semantic tokens.

A `prefers-color-scheme: dark` media rule changes the token roles, including native `color-scheme`. Forms explicitly consume panel/ink colors. There is no visible theme control, localStorage setting or hydration-time theme effect. Next's two media-qualified theme-color metadata entries derive from the same CSS surface tokens, so browser chrome does not maintain a duplicate palette. Include this CSS source in hosted file tracing.

## Layout and motion

The compact search surface precedes a two-column desk. Ranked passages occupy the smaller left column; the larger right column contains exact source inspection and then the optional answer panel. Intrinsic flex wrapping stacks them on narrow screens without JavaScript measurements. Existing labels, search/answer logic, source IDs and evaluation content remain unchanged.

Selected results have both a tint and an inline boundary. The source paper has a narrow plum edge and generous reading space. The app does not add repeated dashboard cards, gradients, decorative eyebrows, numbered sections or an oversized metric hero.

Only inspecting a new source and opening a disclosure animate: a short opacity/position acknowledgement for the selected source and a shorter opacity response for disclosures. There is no initial page motion, scroll reveal, hover lift or idle loop. Reduced motion sets these token durations to zero.

## Verification

This repository owns source audit, contrast checks, lint, strict typecheck and the existing focused tests. The build owns serialized production builds, service lifecycle and real light/dark screenshots. The accompanying redesign review records completed checks separately from pending visual critique. Frozen labels, retrieval results, generation results, corpus and backend/MCP logic remain untouched.
