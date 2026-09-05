# Improvement pass — 2026-09-05

**Scope:** review of the v0.2 tree as it stood, plus the work requested on top of it — more content,
more imagery, animation, and a build that can actually be published and reviewed.
**Author:** Arena agent (Arena.ai Agent Mode), on branch `arena/01a06f5e-heal`.
**Method:** read the whole tree, ran the gates, fixed what failed, then built the additions. Every
"passed" below is a command that actually ran in this sandbox (Node 22.22.3, npm 10.9.8).

---

## 1. What the review found

### Real defects, all fixed

| #   | Defect                                                                                                                                                                                   | Where                                             | Consequence                                                                                                                                                                                                                    | Fix                                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `package-lock.json` was out of sync with `package.json` (missing `@emnapi/*`) **and** every `resolved` URL pointed at `registry.npmmirror.com`                                           | repo root                                         | `npm ci` fails outright → CI red, no deploy, and no install at all from a clean box                                                                                                                                            | lockfile regenerated against `registry.npmjs.org`; `npm ci` verified (see §4)                                                                                                                |
| 2   | CI ran at the repository root, which has no `package.json`, on Node 20 (the app needs ≥22.12), and called `npm run lint`, a script that did not exist                                    | `.github/workflows/ci.yml`                        | every build on `main` was guaranteed red; no gate has ever actually run in CI                                                                                                                                                  | workflow rewritten to run in `anatomy-explorer/`, Node 22, with format/typecheck/gates/build/crawl and an artifact                                                                           |
| 3   | `ASSET_REGISTRY` declared `compressed_bytes: 83648` for the locator GLB, whose real size is 66180                                                                                        | `src/lib/anatomy/asset-registry.ts`               | `check:assets` failed → `prebuild` failed → **`npm run build` could not run at all**                                                                                                                                           | metadata corrected to the real value                                                                                                                                                         |
| 4   | 24 of 26 published items had `image_status: "approved"` pointing at a **68-byte 1×1 PNG**, and no check could see it                                                                     | `src/data/items.json` + `scripts/check-images.ts` | every patient card renders an empty dashed box while the safety machinery reports green — the worst kind of pass                                                                                                               | `check-images` now reads PNG/JPEG/WebP headers and reports sub-8px figures as a named launch blocker (`IMAGES_STRICT=1` fails the build). Data left alone: the row is the clinician's to fix |
| 5   | `${count} ${noun}s` pluralised "stretch" into "stretchs" in three places                                                                                                                 | three pages                                       | visible on live pages                                                                                                                                                                                                          | one `itemCountLabel()` in `lib/section.ts`, used by all three                                                                                                                                |
| 6   | Prettier and `prettier-plugin-astro` were dependencies with no config, no `lint` script and no enforcement; 58 files were unformatted                                                    | repo                                              | "run the linter" was not a thing anyone could do                                                                                                                                                                               | `.prettierijc`… `.prettierrc` + `.prettierignore`, `lint`/`format` scripts, whole tree formatted (separate commit so it can be skipped in review)                                            |
| 7   | The dev server blocked non-localhost `Host` headers                                                                                                                                      | `astro.config.mjs`                                | no preview from any tunnel/sandbox host                                                                                                                                                                                        | `server.allowedHosts: ['.e2b.app', …]`, dev-only, commented                                                                                                                                  |
| 8   | `test:gates` existed but no `test` script; `check:assets` was in `check:all` but nothing else called the suite                                                                           | `package.json`                                    | tests could rot silently                                                                                                                                                                                                       | `npm test` added; both wired into CI                                                                                                                                                         |
| 9   | No `404` route: a dead QR link hit Vercel's blank default                                                                                                                                | `src/pages/`                                      | a patient with a bad link has no way back                                                                                                                                                                                      | branded `404.astro` with the real area list from `getAreaChoices()`                                                                                                                          |
| 10  | No `robots.txt`, no social meta, no icon set, manifest pointed at the Astro default `favicon.svg`                                                                                        | `public/`, `src/layouts/Base.astro`               | shared links render as a bare text bubble; the installed PWA shows Astro's logo                                                                                                                                                | OG/Twitter/canonical block in `Base.astro`, `robots.txt` (Disallow `/preview`), generated icon set, real manifest with maskable icons + shortcuts                                            |
| 11  | Two legacy images (`ex-neck-05`, `str-neck-03`) were reported as orphans because the checker only looked at _published_ rows                                                             | `scripts/check-images.ts`                         | work-in-progress figures were indistinguishable from debris                                                                                                                                                                    | "queued" (referenced by a draft) is now reported separately from "orphan" (referenced by nothing)                                                                                            |
| 12  | 16 published rows' `image_alt_en` ends with _"This is an extended description to satisfy the accessibility minimum length requirement."_ — test scaffolding shipped as clinical alt text | `src/data/items.json`                             | a screen reader reads a sentence about our style rules to a patient instead of describing the position; `alt-text-too-thin` is a **length** floor (45 chars) with no check on content, so the padding satisfied it permanently | `check-images` names every row and fails under `IMAGES_STRICT`. The durable home is a `compliance.ts` rule, which is the clinical contract and not mine to widen                             |
| 13  | The only two published rows with a real file (`ex-neck-01`, `str-neck-02`) point at 1200×896 generated test renders of 354 KB and 387 KB, marked `image_status: approved`                | `src/assets/images/`                              | published pages ship 743 KB of item figures — ~150× a derived SVG — and the two pictures are exactly the class the v1 pilot verdict rejected: professional-looking and wrong                                                   | Reported as a weight warning by design (a real photograph may legitimately be that size); the rows are flagged for clinician replacement                                                     |

Two of the rows above (#12, #13) were **not** visible in the source. They were found by opening the
deployed preview page and reading its rendered HTML — the alt text was in a Markdown-reconstructed
image caption, and the weight was in a `/_vercel/image` URL. Reading a data file tells you what the
project believes; reading what it emits tells you what a patient gets. That is why §5 checks the build
output, and why "we looked at the JSON and it said approved" was never evidence about the images.

### Things deliberately **not** changed

- **The render gate.** `published` + non-empty `reviewed_by` + approved image is the product's
  safety guarantee. Nothing in this pass loosens it, and no fake reviewer names or dates were added.
- **`compliance.ts`.** 53 rules, untouched. The pass only _adds_ scanning (draft advisories, below).
- **`src/config/clinic.ts`** placeholders, the draft safety wording, and the draft legal `approvedBy`
  fields. These are human gates; an agent filling them in would be the exact failure the docs warn about.
- **`patient-library` references** in `src/lib/library.ts`'s history comment — it is narrative, not a live path.
- **Arabic/RTL.** `locale.ts` still registers `en` only. The sheet supplies `name_ar` for two areas;
  inventing Arabic clinical copy is not on the table, so RTL stays a roadmap item rather than a demo.

---

## 2. Content

**26 → 45 items** in the snapshot, 8 areas in both sections.

19 new rows were drafted (10 stretches, 9 exercises), every one of them:

- `status: "draft"`, `reviewed_by: ""`, `reviewed_date: ""` — **none of them can reach a patient**;
- `notes_internal` naming the origin and the required action ("edit in the sheet, re-run sync");
- compliance-clean: `check:compliance` now runs the 53 rules over draft rows as **non-blocking
  advisories** (0 issues today), so bad wording is caught in the preview queue instead of at publish time;
- each carries a generated stand-in figure (see §3) so a reviewer is not signing off a grey box.

Coverage added where the library was thinnest: shoulder stretching went from **zero** items to three
(the published area with no published items, which `check:anatomy` has been warning about), and
ankle/elbow/wrist/lower-back/neck each gained a second or third instruction.

Education content grew from 2 to 8 body-area explainers (`src/data/anatomy/education.ts`), all
`status: 'draft'`, all rejected by `findEducationEntry` until signed. Orientation language only —
structures, how people describe it, what to notice, when to seek help, and the standing
"not a diagnosis" line. No cause, no condition, no advice.

**How to publish any of it:** the row belongs to the sheet. Review in `/preview`, edit the approved
rows in the Google Sheet, re-run `npm run sync:content`. Do **not** flip `status` in the generated JSON.

---

## 3. Images and figures

Two kinds, and the distinction matters:

**a) Deterministic figures, generated from the app's own geometry.** New `src/lib/anatomy/figures.ts`
draws from `geometry/skeleton.ts` (the joint table every hotspot is anchored to) — so a figure cannot
disagree with the body map, which is the failure mode the archived image verdict
(`docs/archive/legacy-2026-08-26/handoffs-v1/H-CLINICAL-SIGNOFF.md`) was written after. Used for:

- the area figure on every section card, area page hero and 404;
- mini figures inside the home entrance cards;
- **19 generated stand-in figures** for the drafted rows (`npm run images:items`), written as
  `src/assets/images/<id>.svg`, each labelled _in the image_ "Generated · pending review" and
  "Stand-in figure, not a technique guide", so a screenshot or print-out carries its own status.
  The generator never overwrites a real file and never touches an approved row.
- **share/social images**: `public/social/area-<id>.png` ×8 + a default card, 1200×630, generated by
  `npm run images:render` and wired per-page into `og:image`/`twitter:image`.
- **app icons**: 512/192/maskable/apple-touch/favicon PNGs + a new `favicon.svg` that is the body
  silhouette on brand blue, replacing the Astro default lightning bolt.

Everything generated is registered in `media-ledger.ts` with `generationMethod: 'generator'`,
`status: 'draft'`, `replacementRequired: true` and an exact byte count + sha256, so `check:assets`
fails if a generated file is later swapped without anyone noticing.

**b) Two AI illustrations** (`public/anatomy/illustrations/*.webp`, 24 KB total): the home hero and a
clinic hand-off banner. They are decorative — `alt=""`, print-hidden, no anatomy detail, no position
depicted — and registered in the ledger with provenance and the prompt recorded below. They are not
instructional imagery and the ledger notes say so in as many words.

> Prompts: _home-hero_ — "wide 16:9 minimalist illustration for a physiotherapy patient app, soft matte
> clay 3D render, stylised figure in a gentle standing stretch, sky-blue accent, light grey
> background, no text, no faces, no medical equipment". _clinic-handoff_ — the same style, a clipboard,
> a printed sheet and an abstract QR stand.

**Payload note:** the whole visual layer (19 item figures, 8 area figures, 9 social cards, 6 icons,
2 webp illustrations) adds ~0.55 MB to the site, of which the social cards are 0.4 MB — and none of
it is on a patient's critical path (cards load only when a link is shared).

---

## 4. Animation and interaction

The design system says "motion: almost none", and for a patient reading dosage numbers that is right.
So motion went in as three narrow families, documented in `DESIGN-SYSTEM.md`:

1. **State feedback** — hover lift, press, focus-ring fade, all ≤220 ms.
2. **Orientation** — one-shot entrances. Implemented with **scroll-driven CSS** inside
   `@supports (animation-timeline: view())`, so no JavaScript ships for it and an unsupported browser
   simply shows the finished page. No `opacity: 0` base state: the failure mode of that pattern is a
   blank page.
3. **The pacer** — the only animation that carries information (below).

`prefers-reduced-motion` kills all three, and anything the pacer communicates is _also_ in text, so
reduced motion degrades to the same information, not less of it.

This claim needed a fix of its own. Items 1 and 2 sit inside a `no-preference` query and die on their
own; item 3 was being silenced only by `base.css`'s global `transition-duration: 0.01ms !important`, which
leaves a countdown ring that snaps once a second — no animation, but not the promised fallback either. The
guide now hides the ring under the setting and leaves the stepped rail as the progress display
(`MovementGuide.astro`, last commit of this pass). Because Astro scopes component styles by attribute, a
selector that quietly stops matching is free at build time, so the rule was checked in `dist/_astro/*.css`
and not in the file: a reduced-motion promise that has only been read, not grepped, is not a promise
anyone has verified.

### The follow-along guide (`MovementGuide.astro`)

The substantive addition. Each item card's four prose fields become a step machine: Start → Move →
Direction → Hold → Return → Other side, with the current step highlighted, a countdown ring, rep and
set counters, a progress rail, and arrow-key navigation.

Three deliberate constraints:

- **Only a number the clinician wrote is ever timed.** A step auto-counts if and only if it came from
  `hold_seconds`. Reading steps wait for the patient to press Next, because a reading pace is not a
  dosage and this app has no authority to invent one. `rest_seconds` is honoured only when present.
- **Nothing starts by itself.** No autoplay, no "let's go!" — the figure animates only while a hold is
  running, and a hidden tab pauses the timer so it cannot burn a hold nobody saw.
- **Nothing is stored.** No localStorage, no sessionStorage, no history writes: counts live in the
  page. D-007 is not only about analytics; a record of what a patient managed today is health data.

It replaces the old `<dl class="steps">` rather than sitting next to it (no duplicate copy), prints as
a clean numbered list (controls and timer are print-hidden), and is fully readable with JS off.

---

## 5. Verification — what actually ran

```
npm ci                      ✓ added 328 packages (after the lockfile fix)
npm run lint                ✓ prettier --check, all included files
npm run typecheck           ✓ astro check — 56 files, 0 errors
npm run check:compliance    ✓ 0 violations · 53 rules · 19 drafts advisored (0 issues) · 4 launch warnings
npm run check:anatomy       ✓ 16 areas, 8 reachable, 14 shapes · 3 warnings
npm run check:images        ✓ missing=0 · 19 queued · 24 stub figures reported (IMAGES_STRICT=1 fails)
npm run check:assets        ✓ 2 registry assets + 15 ledger assets + motion, 0 violations
npm test                    ✓ node:test — 16 tests, 7 suites, 0 failures
npx astro build             ✓ static + vercel server output, 33 routes
npm run crawl               ✓ route crawl clean (anchors, legal, preview isolation, singular routes)
```

**Route crawl:** 33 rendered routes, 26 published anchors verified.

## 6. Known limits — read this before trusting the pass

1. **No browser QA.** Playwright's Chromium cannot be downloaded in this sandbox (CDN is blocked),
   so `scripts/render-v2-qa.mjs` and the 360px/desktop evidence packets the module map demands **do
   not exist**. Every layout claim here comes from reading generated HTML and rendering SVG through
   `@resvg/resvg-js` — not from looking at the site in a browser. The movement guide's interactions
   (countdown, rep counting, announcements) are **untested in a real browser**.
2. **Deploying is not something this sandbox can do _to_ the project, but the branch is live.** There is no
   Vercel credential here (`vercel whoami` → "Logged out"), so nothing here can set project env vars, attach
   a domain or promote a build. What the repo's own GitHub App did, unprompted, is build and deploy the
   pushed branch: `Vercel – heal` and `Vercel – healer` both pass on the preview URL. So the front end is
   reviewable now, and the remaining deploy work is two settings — the project's Production Branch, and
   `PREVIEW_PASSWORD`, without which `/preview` answers 503 by design.
   Checking that 503 is what found a latent bug: the Basic-auth decoder called `Buffer.from`, which does not
   exist in the Edge runtime the Vercel adapter ships middleware to, so the door would have thrown a 500
   the moment a password was configured — every green build before that point, because the line was only
   reachable once someone set the variable. It is now `src/lib/preview-auth.ts` (`atob` + `TextDecoder`,
   constant-time compare, colon and non-ASCII safe) with eight unit tests, and `npm test` globs
   `tests/**/*.test.ts` instead of naming two files: an enumerated list is how a new test file would have
   been skipped forever.

3. **The 24 stub images are still stubs.** Correctly: they are the clinician's to attach. The gate now
   says so loudly; the fix is not code.
4. **`/preview` is guarded by middleware + HTTP Basic only when `PREVIEW_PASSWORD` is set** — with the
   variable unset, the routes return 503 (fail-closed) rather than exposing drafts, which is the right
   default, and the review queue in this sandbox is therefore served by the dev server (loopback bypass).
   Fail-closed on a misconfiguration is a decision, not an accident: an unset env var must not be able to
   publish a drafted clinical row, so the deploy-time choice is to set the variable, never to relax the
   guard. `127.0.0.1.evil.com` does not get the localhost bypass either.
5. **The AI illustrations have unverified provenance.** They are registered `draft` +
   `replacementRequired`. A design asset for a clinical product should be commissioned or drawn from
   the same geometry as everything else — the generator already can, if that decision is made.
6. **`npm run check:all` deliberately still exits 0 on stub images** (warnings, not errors), because
   flipping it to strict today would have left the repo un-buildable for the clinician. Set
   `IMAGES_STRICT=1` in CI on `main` — the workflow already does exactly that.

## 7. Files touched

<details>
<summary>full list</summary>

**New:** `src/lib/anatomy/figures.ts`, `src/components/anatomy/RegionFigure.astro`,
`src/components/exercise/MovementGuide.astro`, `src/styles/motion.css`, `src/pages/404.astro`,
`scripts/render-share-images.ts`, `scripts/render-item-figures.ts`, `public/robots.txt`,
`public/_headers`, `public/social/*.png`, `public/icons/*.png`, `public/anatomy/illustrations/*.webp`,
`src/assets/images/*.svg` (19 generated stand-ins), `.prettierrc`, `.prettierignore`.

**Changed:** `astro.config.mjs` (dev allowedHosts), `package.json` + lockfile (scripts, resvg devDep),
`src/layouts/Base.astro` (motion layer, social meta, icons), `src/pages/index.astro`,
`src/pages/[section].astro`, `src/pages/[section]/[area_id].astro`, `src/pages/area/[area_id].astro`,
`src/pages/preview/index.astro`, `src/pages/clinic.astro`, `src/lib/section.ts`,
`src/lib/anatomy/asset-registry.ts`, `src/lib/anatomy/media-ledger.ts`, `src/lib/anatomy/education.ts`,
`src/data/items.json` (draft rows only), `scripts/check-images.ts`, `scripts/check-compliance.ts`,
`public/manifest.json`, `public/favicon.svg`, `.github/workflows/ci.yml`, `README.md`, `memory.md`,
`DESIGN-SYSTEM.md`.

</details>

## 8. Figures that move, on the page (second pass, same date)

The first pass reported the placeholder problem; this one closes the visible half of it. All 26 published
rows now have a figure derived from their own reviewed text, and on the exercise page that figure
animates through the range the sentence describes.

**Why not a photograph.** The archived clinical sign-off records a photoreal render of `ex-neck-02`
scored "FAIL — worst of the set": the head sat forward of the shoulders, the exact posture the chin tuck
exists to correct, and it had passed a casual review because it looked professional. Correctness is the
property a patient cannot verify, so it is the one that has to be structural. A row's plan states:
posture, joint, direction, and that the movement runs between the two states the sentence names. It never
states degrees, load, or duration.

**The layers, and what each is for.**

| Layer | Content | Why |
| --- | --- | --- |
| `supportsFor` | floor / wall / chair / counter under the body | a figure without its support implies the wrong exercise |
| faded start pose | frame 0 | the state the sentence begins from |
| solid end pose + dashed arc | frame 1, arc between | what "do this" means, readable in a screenshot or on paper |
| live group | per-bone WAAPI keyframes from `boneTimeline` | the travel, which no static drawing can carry |
| printed caption | the row's `movement_en`, escaped, wrapped | the figure carries its own provenance wherever it is pasted |

**Shared arithmetic.** `src/lib/anatomy/movement.ts` is the only kinematics. The SVG writer and the Astro
component read the same functions, so the file on disk and the page are the same drawing at different
sizes — a 320 px card cannot legibly show a 420×620 diagram, so the figure is rendered at the size it is
displayed rather than scaled down.

**Animation is a capability, not a file.** Feeding an SVG through `astro:assets` rasterises one frame, so
schematics bypass the optimisation pipeline; `lib/images.ts` ranks candidates explicitly (usable raster →
schematic → honest empty slot) because alphabetical glob order used to let a 68-byte PNG win. The guide
pauses every figure while a hold counts down and while it is off-screen; `prefers-reduced-motion` and
print get the two static states.

**Scenery is quieter than the exercise.** A supine row is mostly leg, and with every bone inked the same
weight the reader cannot tell which limb the sentence is about — so `actorBonesFor(plan)` in
`movement.ts` defines the moving bones plus everything hanging off them, and both the file writer and the
page draw the complement in a lighter grey. One definition, two renderers: "what is the actor" cannot
drift between the card and the page. The same pass rebased `ex-knee-02` (short arc quad) onto a new
`SUPINE_KNEE_SUPPORT` posture, because on the feet-flat supine baseline the correct shin numbers read as
a bridging leg — a different exercise — which is the sort of thing only a screenshot review catches.

**Gates added** (`scripts/check-poses.ts`, wired into `check:all` and therefore `prebuild`): quote drift
against `items.json`, first-step angle must equal the posture's resting angle, every focus joint must
resolve on the posed body, and every file must match `src/data/anatomy/figure-manifest.json`
(size + sha256) so nobody hand-edits a shipped figure. It caught three real baseline mismatches on its
first run. `npm run images:movement` regenerates; `npm run images:movement:manifest` re-pins.

**Tests** (`tests/movement.test.ts`, 13): frame endpoints per step, no teleporting limb between steps,
keyframe quantisation (byte-stable regeneration), finite geometry for every bone at three points of the
cycle, focus resolution, fit and floor invariants, support lines, and the shipped file being
byte-identical to what the code generates with its caption escaped.

**What this does not fix, and cannot from code:** the 16 padded `image_alt_en` rows, the two heavy
`approved` test renders, `stretching/shoulder` published with no items, the draft safety/education rows,
`clinic.ts` placeholders, legal `approvedBy`. Those are sheet and human decisions — see §6.
