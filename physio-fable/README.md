# physio-fable — Patient Library rebuilt with Fable (F#)

A from-scratch rebuild of the physiotherapy Patient Library where **all
domain logic, safety rules, content, and illustration geometry are written
in F#** and compiled to JavaScript with [Fable](https://fable.io). A tiny
Node seam renders the compiled modules to **static HTML** — patients receive
plain files, F# never ships to a browser.

Isolated from `anatomy-explorer/` (the Astro app) on purpose: this is a
separate line of work that must earn its place before anything merges.

## Status: vertical slice 1

- `src/Domain.fs` — content model (areas, items, dose, draft/published status)
- `src/Safety.fs` — red-flag triggers + pure gate decision (`decide`)
- `src/Content.fs` — seed content: neck area, 2 items (both `Draft`)
- `src/Figures.fs` — deterministic SVG pose renderer driven by joint angles
  (2D kinematic chains; same angles = same picture, always)
- `src/App.fs` — assembles one static demo page (banner, gate draft,
  start-slowly callout, 2 item cards with figures)
- `scripts/render.mjs` — writes `dist/index.html` from the compiled module

## Prerequisites

- .NET 8 SDK (`dotnet --version` → 8.x)
- Node 22+

## Build

```sh
npm install
dotnet tool install --global fable   # once per machine; latest stable, deliberately unpinned
npm run build   # fable Client.fsproj --outDir build && node scripts/render.mjs
```

Output: `dist/index.html` — open it directly, no server needed.

CI (`.github/workflows/fable.yml`) does exactly the above on every push
touching `physio-fable/**` and uploads `dist/` as an artifact.

## Architecture rules (carry over from the rebuild brief)

1. F# owns decisions and pictures; JS/HTML owns nothing but delivery.
2. Static first: every slice must render to a file a patient can open.
3. No backend, no accounts, no analytics, no patient-data transmission.
4. Nothing `Published` without a named clinician reviewer — everything here
   is `Draft` until that happens.
5. Pictures are joint-angle schematics, never AI photoreal bodies.

## Roadmap

- Slice 2 (landed): all 8 areas + 21 items; per-item start→end pose specs
  with auto movement arrows; figure validation gate in F# that runs before
  every render (missing/orphan specs, angle ranges, bounds, arrow length).
- Slice 3 (landed): routing — home plus one static file per area;
  thumbnails drawn from the same figure geometry; first client island
  (safety gate: F#-rendered data attributes upgraded by hand-written JS,
  honest static list without JS).
- Slice 4 (landed): hold timers, device-local completion marks, text-size
  control, client search over an F#-authored index, share-link buttons,
  clinician review gallery. Islands are hand-written JS driven by
  F#-rendered data attributes — no dead controls without JS.
- Slice 5 (landed): per-area education notes, legal notice, 404 with a way
  home, dedicated gate-first locator route (blocking island mode), home as
  a funnel, zero-empty-slots assertion on built output.

Remaining (needs humans or a deploy, not more code): clinician review +
countersign of all content and figures; a canonical public domain (unlocks
QR codes, sitemap, absolute share URLs); real-browser pass incl. dark mode
and no-JS run-through; deciding this line's future vs the Astro app
(merge, replace, or retire one).
- Slice 5: clinician review gallery; search; share/QR.
