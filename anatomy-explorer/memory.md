# memory.md — Anatomy Explorer decision log

The durable memory of this product. Read before making decisions. Append when a decision is made;
never silently rewrite history. Decisions are `A-###` here; `D-###` refers to the exercise
library's log in `../patient-library/memory.md`.

---

## Current state — 2026-08-27

**Complete, Single-App Architecture.** The project is merged into a single app under `anatomy-explorer/`. `patient-library/` has been deleted.
The 3D anatomical locator, compliance pipeline, and strict build validations are implemented and verified.
Content publishing remains blocked by the clinic's Medical Director decision (Decision D8) and the requirement for clinical sign-off on individual items.

Next: Waiting for clinical content sign-off and approval to release.

---

## The people

- **Afsal** — builds it. Not a clinician.
- **The physiotherapist** — owns every clinical word. Currently entering exercise content into the
  Google Sheet for the library (library D-028, 2026-08-25).
- **Agents** — Claude, GPT-5.6 Sol and Antigravity work in parallel. Assignments in
  `handoffs/AGENTS.md`.

---

## Decisions

### A-019 · Demonstration figures are computed from joint angles, not generated
**2026-08-26 · Afsal + Claude · resolves the D-010 / D-015 / D2 deadlock**
`PRD.md` §8 says images are AI-generated. D-010 and D-015 say the opposite, after five of nine
generated images came back clinically wrong *and all nine looked professional*. D2 — demonstrator
gender and clothing — has blocked all ~100 images since 2026-08-23 and was never answered. Three
documents, three positions, nothing moving.

**A figure is now a set of joint angles** (`lib/anatomy/geometry/pose.ts`), drawn from the same
joint table as the body map. Consequences, in the order they matter:

- A limb cannot change length, because length is not an input. A joint cannot exceed its range,
  because every angle is clamped. The D-015 failure mode — confident, plausible, wrong — stops
  being reachable.
- Review becomes editing one number rather than regenerating and hoping.
- Consistency across all ~110 is structural, which is what §8 actually asked for.
- **D2 dissolves.** A neutral stylised figure has no gender or clothing to decide.
- Motion is nearly free: a movement is already two poses, and the frames between them are
  interpolation. Verified — see the frame strips in the prototype.

**Prototype rendered and inspected 2026-08-26** (A-006's rule). Gross limb movement reads well;
neck work does not, because a chin tuck is ~2cm on a 170cm figure. **The fix is per-pose framing**
— `figure_focus` crops the viewBox to the region. That requirement was only found by rendering it.

Fine hand placement stays out of reach and needs photographs — roughly twenty items, shot in the
clinic, not a hundred and ten.

Plan: https://claude.ai/code/artifact/057e5200-961b-42df-8de4-faad6805fdd1

### A-022 · Figures are generated from the joint table, and only the sheet may time a rep
**2026-09-05 · Arena agent**

Two rules came out of the improvement pass, both about not trusting a picture you cannot check.

**Every figure in the product is derived, not drawn.** `src/lib/anatomy/figures.ts` renders from
`geometry/skeleton.ts`, so the area illustration on a card, the stand-in figure on a drafted row, the
share card and the app icon are all the same body the locator marks — one joint table, one source of
drift. The alternative is already documented in this repo's history: the archived image verdict
(`docs/archive/legacy-2026-08-26/handoffs-v1/H-CLINICAL-SIGNOFF.md`) rejected `ex-neck-02` because the
drawn head sat forward of the shoulders, i.e. the picture contradicted the
instruction next to it, and a patient reads the picture. Derivation also means the figures scale with
`--scale`, follow dark mode through tokens, and cost ~2 KB instead of a 400 KB JPEG. The two
text-to-image illustrations that remain (`public/anatomy/illustrations/`) are decorative, registered in
`media-ledger.ts` as `draft` + `replacementRequired: true`, `alt=""`, and print-hidden.

**Only a number the clinician wrote down may be timed.** The follow-along guide (`MovementGuide.astro`)
auto-counts a step if and only if it came from `hold_seconds`; every other step waits for a tap. A
reading pace is not a dosage. Related, and deliberately harsher than the last version: `check-images`
now reads image headers and reports sub-8px stubs, because 24 published rows carried
`image_status: approved` on a 1×1 placeholder and every gate stayed green on an empty frame. The gate
warns by default and fails with `IMAGES_STRICT=1`, which CI sets on `main`. Fixing it means the
clinician attaching the real figure — the data was not touched.

**Motion claims are verified in `dist/`, not in the source.** The guide promised a reduced-motion
fallback — a stepped rail instead of the countdown ring — and the component contained CSS that looked like
it. What actually honoured the setting was `base.css`'s global `transition-duration: 0.01ms !important`,
which left a ring that snaps once a second: not motion, not the promised presentation. Astro scopes
component styles by attribute, so a selector that silently stops matching costs nothing at build time and
shows up as an animation patients cannot turn off. So `grep dist/_astro/*.css` for the rule you think you
shipped, as part of the change that adds it — a reduced-motion claim that has not been checked against the
built CSS is not verified. (Playwright cannot run in this sandbox, so the built-CSS check is the strongest
evidence available here, and it is still not a browser.)

A length floor with no check on content gets satisfied by padding, and the padding is then what patients
receive: 16 published `image_alt_en` values end with "This is an extended description to satisfy the
accessibility minimum length requirement." because `validate.ts` requires 45 characters. Weakening the
length rule to "fix" that is the wrong move — the fix is a real sentence about the position, which only
someone who has seen the approved picture can write. The same rows also hold the inverse: the two that do
have a file are 387 KB generated test renders marked `approved`.

How to apply: never hand-draw anatomy or hand-place a hotspot coordinate; never let a component invent
a tempo, rest interval or rep count the sheet did not supply; never persist patient activity anywhere
(no storage keys beyond `physio-scale`).

### A-020 · Content is drafted ahead of clinical review, and the boundary is a wall
**2026-08-26 · Afsal**
~110 items are being drafted without waiting for the physiotherapist. This is fine and normal —
drafting for review is how clinical content gets made, and non-negotiable #2 is about what reaches
*patients*, not about who types first. `status: 'draft'` with empty `reviewed_by` already keeps it
away from patients.

What changed to make that safe rather than merely intended: `unreviewed-published-item` in
`lib/validate.ts` was **promoted from `warn` to `error`**. It had been firing on every build while
five published items sat unsigned, and a rule nothing enforces is worse than no rule. A row now
cannot reach `published` without a clinician's name on it — the build refuses.

How to apply: draft freely, mark uncertain dosage and safety lines in `notes_internal`, and hand
her the `/preview` URL rather than a document. The last twelve-question form went unanswered.

### A-015 · `exercise` stays singular; every path goes through `lib/section.ts`
**2026-08-26 · Afsal + Claude · closes the PORT-CHECKLIST Tier 3 naming trap**
`section` in the data is `exercise`, singular. The A-014 shell hardcoded `/exercises/`, so
`[section]/[area_id].astro` emitted `/exercise/neck/` while the index cards linked to
`/exercises/neck/` — every exercise link 404'd, and it read as a routing bug rather than a
pluralisation one. Resolved **singular**: it matches the data, matches the live app's own
`index.astro`, and matches URLs already sent to patients on a QR code.

The decision is enforced structurally, not by discipline: `src/lib/section.ts` owns `sectionPath`,
`areaPath`, labels and the `Section` type, and no other file contains the string `/exercise` or
`/exercises`. If that literal reappears anywhere else, the bug is coming back.

### A-016 · The locator hands off through a real `/area/<id>/` route
**2026-08-26 · Afsal + Claude · implements MERGE-PLAN region→area resolution**
The locator previously contained two links — home and the skip link — so the home page's primary
call to action led to a screen a patient could only back out of. Region→area resolution now lands
on its own prerendered page rather than a JS screen inside the locator, because a patient can be
sent "your neck page" directly, it works with JS disabled, and the back button behaves.

Consequence worth keeping: every destination in the locator is a server-rendered `<a href>`. No
client-side routing and no JS-built URLs, per PRD §10.

### A-017 · The red flags appear on the item page, not only in the locator gate
**2026-08-26 · Afsal + Claude · supplements A-007, does not supersede it**
Walking the app as a patient showed the A-007 gate was bypassable: the home page's "Stretching"
and "Exercise Protocols" entrances go section → area → items and never touch the locator, so on
those routes the eight triggers were never shown at all. A-007 puts the check "before any exercise
handoff", and those are handoffs.

`RedFlags.astro` now renders the same eight `SAFETY_RULES` on the area item page, whichever route
reached it. It is a **panel, not a second blocking gate**: a patient opens that page daily, and a
wall they tap through every day is a wall they stop reading by the third day. The blocking gate
stays in the locator as a first-visit orientation step.

It is also styled deliberately quiet — bordered notice, warning rule and heading, not a solid
alarm block. The first version stacked two full-width yellow panels above the fold and pushed the
first exercise a screen and a half down. Alarm styling on something seen every day is how a
warning becomes wallpaper.

**Still open for the clinician:** all eight triggers are `status: 'draft'` with empty
`reviewedBy`. `check:anatomy` reports it on every build.

### A-018 · One compliance list, one joint table, one publication rule
**2026-08-26 · Afsal + Claude · closes three duplications found in the 2026-08-26 review**
Three places had grown a second, weaker copy of something that should exist once:

- `lib/anatomy/content-validation.ts` carried its own 7-pattern `BANNED_LANGUAGE` against
  `compliance.ts`'s 53 — with **zero condition names and zero booking CTAs**, the two groups that
  carry the legal weight. Retired; `education-validation.ts` imports the real list.
- `body-regions.ts` hand-listed nine regions including `upper-back` and `foot` (no library area —
  dead ends) and omitted `elbow` (two exercises — unreachable). That is verbatim the drift A-005
  was written after, live for a second time. Geometry now derives from the joint table in
  `lib/anatomy/geometry/`, availability derives from published content, and the
  `check:anatomy` script A-005 promised finally exists and fails the build on drift.
- "Published AND has published items" now lives once, in `lib/library.ts`, and is asserted again
  by `check:anatomy`. Pages no longer each decide what reachable means.

The general rule this encodes, from `compliance.ts`'s own header: *two copies of a compliance list
is two chances for them to drift.* They had drifted, in the direction of less protection, in the
folder that is meant to become the product.

### A-011 · Unified application replaces the additive split
**2026-08-26 · Afsal**
The anatomy locator and exercise library will become one deployable application. The unified app
keeps both direct body-area browsing and visual discovery, with one normalized content snapshot,
one compliance pipeline, and one safety model. `patient-library/` remains the live reference and
rollback target during migration; it is not edited as part of this decision. Anatomy data may
reference stable published library IDs, but must not duplicate exercise instructions, dosage, or
safety content. This resolves the earlier “additive front door” positioning while preserving the
separate-app migration safety boundary until the cutover is proven.

### A-012 · Full-body 3D is the signature experience
**2026-08-26 · Afsal**
On capable devices the primary locator is a full-body 3D human: broad region selection highlights
and zooms, an on-demand regional scene supports exact-zone selection, and the app asks whether
that is the exact place of discomfort before safety and education. The accessible 2D map and
semantic controls remain a complete equivalent for keyboard users, constrained devices, WebGL
failure, and reduced-complexity preference. 3D is primary in product intent but progressive in
delivery. Models and hotspots require size budgets, lazy loading, stable logical IDs, rendered
visual QA, and clinician verification. Educational “usual scenarios” are reviewed cautious
content, never an inferred explanation for the individual user.

### A-013 · Superseded planning is archived, not deleted
**2026-08-26 · Afsal**
The earlier anatomy-only backlog, module briefs, build prompts, and agent-control documents are
preserved under `docs/archive/legacy-2026-08-26/`. They are not implementation instructions for
the unified product. This keeps all useful history recoverable while leaving one active PRD,
architecture, safety contract, and build sequence for future work.

### A-014 · Unified shell starts with three first-class entry points
**2026-08-26 · Afsal**
The unified app home presents Find a body area, Stretching, and Exercise Protocols as equal
workflows. The visual locator is not a mandatory gate for patients who already know their area.
The canonical locator URL is `/find-my-area/`; `/find-my-pain` remains as a compatibility route
until redirects and external links are audited.

### A-001 · Separate app, additive to the library
**2026-08-26 · Afsal**
Anatomy Explorer is its own Astro app in `anatomy-explorer/`, not a route inside the exercise
library. The library is live and in a clinician's hands; a WebGL-capable interactive surface has
opposite non-functional requirements to a near-zero-JS content site. The two share a repository
and a build-time content snapshot, nothing else.

### A-002 · Three screens, not seven
**2026-08-26 · Afsal + Claude**
Locate → Confirm → Exercises, with the safety gate between the last two. The intro screen is cut:
"Where do you feel discomfort? → Explore the body" costs a tap and delivers nothing.

The three symptom questions are cut too. They cannot alter routing (routing is by area) or
education (education is per region), so they changed nothing — while costing three screens and
implying the app was working something out about the patient, the impression
`PRODUCT-BLUEPRINT.md` §8 exists to prevent.

### A-003 · Confirmation is where education begins
**2026-08-26 · Afsal + Claude**
The confirm step was a yes/no gate — two taps to learn nothing. It becomes the screen that says
something true about the spot the patient just chose.

Rationale: precision changes what they *read*, not where they route, and that is intentional — a
patient who points slightly wrong still lands somewhere useful. The value of the confirm step is
rapport, and *perceived behavioural control* is the only high-quality adherence predictor in the
library's `RESEARCH-FINDINGS.md`. Never tell the patient their answer was imprecise.

### A-004 · The muscle figure — body as output, not only input
**2026-08-26 · Afsal + Claude**
Every exercise shows which muscles it works, highlighted on a small body diagram.
`target_muscles_en` is populated on all 26 library items and already clinician-written, so this
adds **zero** new clinical content. The library's own research notes no incumbent shows target
muscles to patients.

This is what lets v1 ship a useful education layer while the clinician is still finishing the
exercise corpus.

### A-005 · Regions are derived from the library, never hardcoded
**2026-08-26 · Afsal**
A build-time snapshot of `areas.json` and `items.json` decides which regions exist. Before this,
the locator offered `upper-back` and `foot` (zero exercises — dead ends) and omitted `elbow`
(two exercises — unreachable). `check:anatomy` fails the build on drift.

### A-006 · Hotspots are generated from a shared joint table
**2026-08-26 · Afsal + Claude · inherits library D-015**
The silhouette and every hotspot derive from one set of joints, so a hotspot cannot drift off the
limb it names. Hand-authored coordinates produced a wrist marker floating off the arm and a lower
back tappable on the abdomen.

Two specifics that are the actual bug fixes: the hip hotspot anchors on the **trochanter**, not
the leg root, or the two sides collide at the midline; and `lower-back` is **back-view only**.

Library D-015 is the precedent: five of nine generated images were clinically wrong and all nine
looked professional. A wrong hotspot looks fine too. **Render it and look at it.**
Verified geometry: `reference/body-geometry/`.

### A-007 · The safety gate is a gate, not a question
**2026-08-26 · Afsal**
One screen, the eight approved triggers from `CLINICAL-SAFETY.md` §3 verbatim, before any
exercise handoff. No skip, no "I'm not sure" that routes onward, no route to an exercise from the
stop screen — including by browser back.

Before this the app collected `after-injury` and `burning-tingling` as answers and proceeded to
exercises regardless.

### A-008 · Nine modules, exclusive file ownership, parallel agents
**2026-08-26 · Afsal**
`AnatomyLocator.astro` at 416 lines meant every task touched one file, so parallel work was
impossible. M0 splits it per screen and freezes the type contract; after that three agents run at
once. Ownership table in `MODULE-HANDOFF.md`; an agent that needs a file it does not own stops
and reports.

### A-009 · GPT-5.6 Sol owns the visual modules
**2026-08-26 · Afsal**
M1, M4, M6 and M9 go to Sol because it takes vision input and can judge its own rendered output.
Claude takes structure, state and clinical language; Antigravity takes scripts and validation.
M0 ships `scripts/shoot.mjs` so every visual module has a repeatable render loop rather than
clicking around. A visual module is not finished until its agent has attached the images and said
what it saw.

### A-010 · v1 ships with zero new clinical prose
**2026-08-26 · Afsal**
The education layer is derived from `target_muscles_en` and gated on `status: 'published'`. The
total clinical ask for launch is one wording review of the emergency line. Rationale: the
clinician is mid-way through the *first* content corpus; a second one before that lands is the
failure `../patient-library/BUILD-PLAN.md` was written to prevent.

---

## Open — needs the clinician

See `CLINICIAN-QUESTIONS.md`. **Note that the library's D1–D8 were never answered** — the brief
form in `../patient-library/prototype/` was built and appears never to have come back. Those
questions are now older and cheaper to answer than they will ever be again.

---

## Deliberately not doing

Diagnosis · probability or cause · accounts · server-side symptom storage · pain scale, type or
duration questions · multi-spot charting · 3D in the locator · analytics.

Each was considered and rejected with a reason in `PRD.md`. If one comes back, write a new
decision entry rather than quietly reversing.

---

## Risks

- **The boundary between education and symptom-checking is defended by one build check — which
  does not exist yet.** `check:anatomy` is M2's deliverable and `package.json` has no such
  script, yet fifteen references across the docs and hooks describe it in the present tense.
  Audited 2026-08-26. Until M2 lands the constraint is held by review alone. And once it does
  land: if it is ever relaxed to get a build green, the constraint is gone silently. Never
  weaken it; fix the content.
- **A wrong hotspot looks right.** Library D-015, restated. Visual verification is not optional.
- **Agents wander.** `astro.config.mjs` was deleted from the live app and sat missing for days.
  The `patient-library/` write-block hook and the `LIVE APP TOUCHED?` review line exist for this.
- **D8, inherited.** Whether a regulator reads this as education or advertisement. A body map is
  the most product-like surface on the site and therefore most exposed. No outcome claims, no
  condition names, no booking CTA.

### A-023 · A figure animates on the page, and the page and the file share one arithmetic
**2026-09-05 · Arena agent**

The 24 published rows that used to render an empty frame now render a movement figure, and the figure
moves. Two decisions made that worth more than the drawing itself.

**One source of kinematics.** `src/lib/anatomy/movement.ts` owns the maths — `frameAt` (what the body
looks like at time _t_), `boneTimeline` (when each bone moves, quantised to 0.1% of the cycle so a
regenerated file is byte-stable), `sceneFor`, `fitFor`, `supportsFor`, `arcFor`. The SVG writer in
`scripts/render-movement-figures.ts` and the browser component `MovementFigure.astro` both consume it: a
screenshot of a card and the live page cannot disagree, because there is no second table of angles to
drift. (The earlier prototype `geometry/pose.ts` + `scripts/render-poses.ts` is still in the tree, marked
deprecated at the top of both files — nothing in the build reads them.)

**The figure looks up its own row.** `MovementFigure.astro` takes an `itemId`, not a plan. Passing a plan
in would let a page pair any drawing with any sentence; looking it up makes a mismatch structurally
impossible, which is how the images died the first time.

**A gate, not a screenshot.** `scripts/check-poses.ts` (in `check:all`, so in `prebuild`) fails the build
unless: every plan quotes its row's text verbatim; every plan's first step starts at the angle its
posture actually rests that bone at; every highlighted joint resolves on the posed body; and every
figure on disk matches `src/data/anatomy/figure-manifest.json` byte for byte. It found three baseline
mismatches the first time it ran — each of which would have rendered as a limb starting mid-movement,
which is the failure a reviewer's eye slides over. `npm run images:movement` regenerates,
`npm run images:movement:manifest` re-pins.

**Scenery is quieter than the exercise.** `actorBonesFor(plan)` is the one definition of "the moving bones plus everything
hanging off them"; the file writer and the page both dim its complement, because a supine figure is mostly
leg and an evenly inked body does not say which limb the row is about.

**What is deliberately not claimed.** No degrees are printed, ever: amplitudes are drawing constants, and
the one row whose text says 45 degrees is the one figure allowed to say it. The cycle is 4.4 s of
*shape*, not dosage — `hold_seconds` still comes only from the sheet, and the figure pauses while the
guide counts a hold (`data-figure-paused`), because a moving picture next to a number you are supposed
to be reading is two instructions. Off-screen figures are paused by an IntersectionObserver; reduced
motion and print both fall back to the same two static states. The `astro:assets` pipeline is bypassed
for schematics — it rasterises one frame and the animation is gone — and `lib/images.ts` now ranks
candidates explicitly (usable raster > schematic > honest empty slot), because alphabetical glob order used
to let a 68-byte PNG beat a checked figure.

**Still human-owned, unchanged by any of this:** the 16 padded `image_alt_en` rows, the two heavy
`approved` test renders, the draft safety/education rows, `clinic.ts` placeholders, legal `approvedBy`.
A generated figure is labelled as one in the image, on the card, and in the manifest — it is an
illustration awaiting clinician review, never a demonstration of technique.
