# pshyapp

Patient-facing physiotherapy education for a clinic in the UAE: an interactive body-area locator
in front of a clinician-reviewed stretching and exercise library. Astro, deployed on Vercel,
content synced from the physiotherapist's Google Sheet.

## Where the work is

**This is a single-app repo.** `anatomy-explorer/` is the product and the whole product (decisions
A-011, A-012, A-014): the body-area locator, the clinician-reviewed stretching and exercise library,
the clinic hand-off screen and the content pipeline, in one build.

`patient-library/` was stripped for parts and **deleted**; the folder no longer exists. Any document
that says to read from it, copy out of it, or "never delete" it is stale — see `AGENTS.md`. Git
history is the rollback target.

There is also a small asset toolkit at the root, `region-map-build/`, which generated the 2D region maps
from the app's own geometry. It is standalone: nothing in `anatomy-explorer/` imports it.

`anatomy-explorer/PORT-CHECKLIST.md` is the record of what was brought across from the old folder and
what each item's known defect was. It is historical now; the live go/no-go list is
`anatomy-explorer/HANDOFF.md` plus `anatomy-explorer/docs/RELEASE-CHECKLIST.md`.

## Working here

`cd` into the folder you are working on. **Never run a build or install from the repository root**
— there is no `package.json` here.

**Read `AGENTS.md` first.** It is the canonical rules file; `CLAUDE.md` and `GEMINI.md` beside it are
pointers to it, and `anatomy-explorer/AGENTS.md` adds local detail. Cursor rules are in
`.cursor/rules/`. The short version:

- Content lives in the Google Sheet, not the repo — `src/data/*.json` is generated.
- Never invent clinical content. Anything clinical ships as `draft` with no reviewer named.
- Never relax the compliance check. Fix the content instead.
- Navigation is by body area, never by condition. No analytics, accounts or backend.
- Loose documents at this root are untracked. **Never run `git clean -fd` here** — there is nothing to
  clean, and the flag takes the whole tree with it.

## Known state, 2026-09-05

`anatomy-explorer/` is committed and builds: `npm ci`, `npm run lint`, `npm run typecheck`,
`npm run check:all`, `npx astro build` and `npm run crawl` all pass in a clean Linux/Node 22
environment (see `anatomy-explorer/docs/IMPROVEMENTS-2026-09-05.md` for the exact run). CI now runs in
that folder on Node 22 instead of at this root, where there is no `package.json`.

What is **not** done is human, not technical: 24 published rows still reference 1×1 placeholder
figures, the clinic identifiers in `src/config/clinic.ts` and the legal `approvedBy` fields are
unfilled, the locator's safety wording and the eight drafted education entries are unsigned, and the
site has never been opened in a browser by anyone on this pass (no browser binary is available in the
build sandbox). `anatomy-explorer/HANDOFF.md` and `docs/RELEASE-CHECKLIST.md` carry the current
go/no-go list.
