# Handoff — Unified Anatomy Explorer

**Updated:** 2026-09-05  
**State:** Builds, gates and CI are green in a clean environment; content, imagery and human sign-off are
still the blockers. Improvement pass and its evidence: `docs/IMPROVEMENTS-2026-09-05.md`.

## Product

Anatomy Explorer is a clinic-guided physiotherapy handbook. A clinician can share a stable area or
exercise link, QR code, or printout. Patients can also browse head-to-toe or use the body locator.
The full-body 3D human is the signature exploration experience, with a complete semantic/2D path.

`../patient-library/` remains live, reference-only, and the rollback reference. Never edit it.

## Implemented foundation

- Local areas/items snapshot with schemas and cross-row validation.
- Shared compliance, image validation, and anatomy checks.
- Legal content, footer, disclaimer, text-size controls, and design tokens.
- Home, locator, area, section, item, legal, clinician preview, and clinic mode (`/clinic`) routes.
- Central singular `/exercise/` route mapping.
- Clinic handoff panel with instant search, copy link, dynamic QR codes, patient view, and print handouts (Module H1).
- Handbook search dialog with keyboard navigation and grouped results (Module H1).
- Deep-link anchor auto-scroll, card highlighting, and focus management (Module H1).
- Enforcing image check failure on missing published assets (`check-images.ts`).
- Unpublished "Coming soon" cards hidden from patient section indexes (Module S1).
- Inferred item priority removed from exercise views (Module S1).
- Draft safety wording isolated from patient routes (`RedFlags.astro`).
- Locator-to-area server-rendered handoff and accessible non-3D interaction.
- One-region Three.js neck slice with a draft registry-backed GLB, progressive capability check,
  error state, orientation controls, and semantic fallback.

These bullets describe implementation, not acceptance. H1, V1, and V2 are source-reviewed but do
not yet have complete visual evidence or human approval.

## Immediate blockers

Re-verified 2026-09-05. Items 1 and 6 below are **closed** in a Linux/Node 22 sandbox (all `tsx` gates
run, `npm ci` works after the lockfile fix, the build completes and the route crawl is clean); the rest
are open and are human, not technical.

1. ~~Verify all `tsx` gates in a supported target runtime.~~ **Closed** — every gate, `astro check`, the
   build and `crawl-routes` pass on Node 22.22.3. The old `uv_os_get_passwd ENOMEM` crash was the Node
   24.13.0 sandbox, not the code.
2. Obtain clinician input / sign-off for review metadata (`reviewed_by` and `reviewed_date`) — and now
   also for the 19 drafted items and 8 education entries, which are `draft` by construction.
3. Obtain clinician review for the draft safety rules in `RedFlags.astro`.
4. Render and verify the Three.js slice **and the new follow-along guide** at 360px and desktop —
   canvas, loading, error, reduced-motion, keyboard, non-WebGL fallback. **No browser was available in
   the build sandbox**, so no visual evidence packet exists for any of it. This is the biggest open gap.
5. Obtain clinician/visual approval for region boundaries and orientation; keep all assets draft until then.
6. ~~Complete a successful build and rendered route crawl, including legal/preview isolation.~~ **Closed.**
7. **Partly closed:** 24 published rows still carry `image_status: approved` on a 1×1 placeholder file,
   but no longer render an empty frame — every published row now has a movement figure derived from its
   own reviewed sentence (`npm run images:movement`), animated on the exercise page and gated against the
   sheet by `scripts/check-poses.ts`. What remains is the human half: a clinician photographing or
   drawing the real demonstration, and `image_status` staying `approved` only when they say so. A
   generated schematic is labelled as one everywhere; it is not a demonstration of technique.
8. **New:** the image metadata is worse than "missing" on 16 rows. Their `image_alt_en` ends with _"This
   is an extended description to satisfy the accessibility minimum length requirement."_ — padding written
   to get past `validate.ts`'s 45-character floor, now read aloud to patients. Trimming the sentence is
   not the fix: it drops the alt under the floor. Each one needs a real description of the position and
   which joint should feel it. And the only two rows with an actual file (`ex-neck-01`, `str-neck-02`)
   point at 354–387 KB generated test renders marked `approved` — the class the v1 pilot verdict rejected.
   `check:images` names all of it; `IMAGES_STRICT=1` fails the build on the alt text and the stubs.

The proposed implementation defaults and exact review copy for the eight human decisions are in
`docs/LAUNCH-DECISION-PACK.md`. They enable preview work but do not constitute human approval.

## Next product slice

After stabilization, take the implemented neck slice through verification and human review end-to-end: full-body 3D load,
highlight/zoom, optional meaningful precision, location confirmation, safety, area education, and
handoff to published stretches/exercises. Prove the same content through deep link, QR, print, and
semantic fallback. Then conduct clinician review and five observed patient tests.

## Verification truth

Do not claim typecheck, build, compliance, anatomy, image, accessibility, browser, or visual checks
passed unless they actually ran. The app folders are untracked; preserve them and avoid destructive
git commands.

Latest command truth (2026-09-05, Linux / Node 22.22.3 / npm 10.9.8): `npm ci` ✓ · `npm run lint` ✓ ·
`npm run typecheck` ✓ 56 files 0 errors · `npm run check:all` ✓ (compliance, anatomy, images, assets,
16 tests) · `npx astro build` ✓ 33 routes · `npm run crawl` ✓. No browser QA: Playwright's Chromium
cannot be downloaded in this sandbox.
