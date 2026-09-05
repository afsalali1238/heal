# 3D Body Locator and Exercise Motion — Detailed Implementation Plan

**Status:** Implementation plan / prototype execution contract  
**Date:** 2026-08-27  
**Owner:** Codex supervisor — visual, Three.js, animation and asset surfaces  
**Clinical owner:** Physiotherapist; Medical Director where jurisdiction-specific wording requires it

## 1. Outcome

Build a complete, static-first patient handbook experience with two connected visual layers:

```text
Home
  → Find a body area
  → full-body 3D locator
  → broad-region selection and zoom
  → optional exact-zone selection
  → safety interruption
  → area education
  → exercise page
  → approved text plus optional movement demonstration
```

The 3D body is a spatial navigation and education surface. It is not a diagnostic engine and must
never imply that a tap identified the cause of an individual's discomfort. Exercise motion explains
the reviewed movement; it does not replace the written instructions, dosage, safety line or clinician
handoff.

## 2. Non-negotiable boundaries

- `patient-library/` is reference-only and must not be edited.
- Clinical wording, dosage, safety lines, target muscles, anatomy education and movement authority
  come from the physiotherapist.
- Prototype models, generated visuals and generated videos may be used internally but must be
  marked `prototype`, remain noindex/draft, and be technically excluded from patient routes.
- Do not use unconstrained image-to-video generation as the final source of an exercise movement.
- Every final motion asset needs separate movement-fidelity review, even when the model and text are
  already approved.
- The 2D/simple and semantic flows remain complete equivalents to the 3D flow.
- No accounts, analytics, tracking, backend, patient history or inferred exercise recommendation.
- Do not modify config, lockfiles, CI or dependencies as part of this plan unless a separate task
  explicitly assigns that work.

## 3. Prototype policy

During implementation, temporary assets are allowed to prove layout and interaction:

```text
prototype → internal preview only → visual/technical review → replace or approve → publish gate
```

Temporary assets must include:

- source URL/provider;
- generation or acquisition date;
- creator/tool;
- original and optimized file hashes where available;
- license/usage note, even if temporary;
- `status: prototype`;
- empty `reviewed_by` and `reviewed_date`;
- an explicit replacement ticket or source note;
- `replacementRequired: true` until an asset is approved for continued use;
- the independent references used when an original asset is recreated rather than reused.

No placeholder may be silently treated as approved because it looks polished.

## 4. Target architecture

### 4.1 Browser application

- Astro static routes for home, area, exercise, legal, print and clinician handoff.
- A focused Three.js client island for the full-body locator and optional motion player.
- `GLTFLoader` for GLB/GLTF models and `AnimationMixer` for animation clips.
- Anime.js only for interface transitions, labels, panels and non-clinical micro-interactions.
- Poster-first media rendering with explicit Play/Pause/Replay controls.
- No autoplay for reduced-motion users; preferably no autoplay at all.
- Simple SVG/semantic fallback available before or instead of WebGL.

### 4.2 Asset layers

```text
Tier 1: semantic controls and simple SVG fallback
Tier 2: lightweight full-body locator GLB
Tier 3: optional regional-detail GLB and approved hotspots
Tier 4: exercise poster and optional short motion GLB/MP4
```

Tier 1 must remain usable if every other tier fails.

### 4.3 Suggested implementation files

```text
src/components/anatomy/
  AnatomyCanvas.astro
  AnatomyCanvas.ts
  RegionControls.astro
  SimpleBodyMap.astro
  ModelLoadingState.astro

src/components/exercise/
  ExerciseMotion.astro
  ExerciseMotionPlayer.ts
  ExercisePoster.astro

src/lib/anatomy/
  model-registry.ts
  camera-presets.ts
  region-highlighting.ts
  interaction.ts
  capabilities.ts

src/lib/motion/
  motion-registry.ts
  motion-validation.ts
  motion-status.ts

src/data/anatomy/
  body-regions.ts
  camera-presets.ts

public/anatomy/models/
public/anatomy/fallback/
public/exercise-media/

scripts/
  check-motion-assets.ts
  generate-motion-preview.ts
  inspect-glb.ts
```

Use the existing structure where equivalent files already exist. Do not create duplicate registries
or alternate compliance/publication rules.

## 5. Data contracts

### 5.1 Locator model registry

The registry is technical/visual data, not clinical content:

```ts
type AnatomyModelAsset = {
  assetId: string;
  path: string;
  posterPath: string;
  status: 'prototype' | 'draft' | 'approved' | 'retired';
  sourceUrl: string;
  license: string;
  attribution: string;
  generationMethod: 'original' | 'generator' | 'adapted' | 'temporary-third-party';
  replacementRequired: boolean;
  referenceSources: string[];
  fileHash: string;
  triangleCount: number;
  compressedBytes: number;
  reviewedBy: string;
  reviewedDate: string;
};
```

### 5.2 Logical body regions

Mesh names must never be the application contract. Each region has a stable logical ID and may map
to one or more meshes/hit meshes:

```ts
type BodyRegionVisual = {
  regionId: string;
  meshNames: string[];
  hitMeshNames: string[];
  cameraPreset: string;
  fallbackLabel: string;
  available: boolean;
};
```

`available` must derive from the existing published-content mapping. Unsupported geometry must not
pretend to lead to content.

### 5.3 Exercise motion registry

Motion metadata stays separate from clinician-authored exercise rows:

```ts
type MotionAsset = {
  exerciseId: string;
  motionPath?: string;
  posterPath: string;
  previewPath?: string;
  durationSeconds?: number;
  loop: boolean;
  cameraView: 'front' | 'side' | 'three-quarter';
  status: 'prototype' | 'draft' | 'approved' | 'retired';
  sourceUrl: string;
  generationMethod: 'manual' | 'mocap' | 'licensed-footage' | 'ai-prototype';
  license: string;
  attribution: string;
  replacementRequired: boolean;
  referenceSources: string[];
  fileHash: string;
  reviewedBy: string;
  reviewedDate: string;
};
```

Patient rendering requires both the exercise publication gate and the media gate. A prototype or
draft motion may appear only on an isolated, noindex internal preview.

## 6. Phased implementation

### Phase 0 — Baseline and scope lock

**Purpose:** prevent visual work from masking existing release failures.

Tasks:

1. Record current `git status --short`.
2. Confirm no runtime import crosses into `patient-library/`.
3. Confirm the current singular `/exercise/` route helper remains the only route source.
4. Read the existing 3D architecture, asset pipeline and media plan before editing.
5. Inventory current Three.js files, draft GLB, registry and fallback behavior.
6. Record the current command-verification limitation honestly: the `tsx` launcher may fail under
   the current Node environment before scripts execute.

Exit criteria:

- Existing behavior is documented.
- No clinical content is added.
- No config or dependency changes are introduced.
- V2 has a disjoint file ownership list.

### Phase 1 — 3D locator vertical slice

**Purpose:** make one body-region journey work end to end.

Tasks:

1. Keep the simple map and semantic list rendered immediately.
2. Load the current draft full-body GLB only after capability checks and user intent.
3. Add front, back and reset controls.
4. Add constrained drag rotation; do not auto-rotate while selecting.
5. Add raycast selection using generous invisible hit meshes.
6. Add region highlight with a non-flashing selected state.
7. Add stored camera focus targets and cancellable zoom.
8. Synchronize canvas selection, heading, semantic list and simple map.
9. Add loading, asset-error and “Use simple view” states.
10. Keep all unsupported regions visibly unavailable or non-interactive.
11. Implement keyboard completion without requiring canvas interaction.
12. Add reduced-motion behavior: no animated camera interpolation when requested.

Exit criteria:

- Full-body front/back screenshots exist at 360px and desktop.
- Neck or shoulder selection reaches the correct area route.
- WebGL failure and simple-view journeys complete.
- Screen-reader/keyboard users can select the same region.
- Region IDs, labels, hit areas and camera targets match visually.

### Phase 2 — Model preparation and optimization

**Purpose:** replace the blockout with a usable prototype model while preserving the contract.

Candidate workflow:

```text
MakeHuman/MPFB2 comparison candidate
  → compare against the current generated blockout
  → Blender cleanup
  → separate logical region/hit meshes
  → remove hidden geometry
  → decimate/retopologize conservatively
  → GLB export
  → optional Draco/Meshopt optimization
  → asset checks
```

Tasks:

1. Run a MakeHuman/MPFB2 spike and export one neutral rigged GLB.
2. Compare it with the current generated blockout for mobile appearance, rig quality, region
   selection, motion retargeting, file size and front/back readability.
3. Use MB-Lab or another generator only as an alternate prototype when MakeHuman/MPFB2 cannot meet
   the required rig or shape workflow.
4. Choose a neutral, inclusive, non-photorealistic visual style.
5. Name regions using stable logical IDs in a sidecar registry.
6. Avoid detailed internal anatomy that implies diagnostic precision.
7. Confirm left/right and front/back orientation.
8. Record triangle count, compressed size, texture size and hashes.
9. Produce a poster/fallback image from the same approved visual source.
10. Keep the temporary model status as `prototype`.

MakeHuman/MPFB2 spike acceptance:

- one model imports into Blender without a broken rig;
- one optimized GLB loads through the existing Three.js path;
- region hit meshes can be added without changing the visible surface contract;
- a basic test animation can be retargeted;
- comparison measurements and screenshots are recorded;
- the selected candidate and rejected candidate remain documented.

### Phase 2A — Anatomy reference packet

**Purpose:** give visual builders and the physiotherapist a shared reference without copying one
external atlas into the product.

Reference candidates:

- Z-Anatomy for whole-body and named-structure orientation;
- OpenAnatomy for scan-derived joint and regional accuracy checks;
- NIH 3D for isolated bones or structures with suitable individual terms;
- BodyParts3D as a secondary topology/orientation reference;
- Servier Medical Art for flat medical-illustration composition.

Tasks:

1. Create a reference packet for the first neck/shoulder region.
2. Capture front, back and relevant side views from multiple independent references.
3. Record the source and usage terms beside every reference.
4. Identify only factual relationships needed by the product: surface location, orientation,
   approximate region boundary and camera framing.
5. Do not trace or reproduce one protected mesh or illustration as the production asset.
6. List disagreements between sources as questions for the physiotherapist.
7. Keep internal anatomical detail out of the locator unless it has a reviewed educational purpose.

Exit criteria:

- the packet uses multiple independent references;
- required surface-region placement is understandable;
- no external clinical wording is imported;
- the physiotherapist can review region boundaries without opening modelling tools.

### Phase 2B — Fallback SVG body-map spike

**Purpose:** make the non-WebGL experience visually intentional and equivalent to 3D navigation.

Compare three approaches:

1. an original SVG silhouette derived from an original/approved body render;
2. a properly attributed Servier-based adaptation where suitable;
3. a code-native region map inspired by MIT body-highlighter interaction patterns.

Use Health Icons where a standard health/action icon is genuinely needed. Do not use icons as a
substitute for clear text labels.

Acceptance criteria:

- front/back views use the same stable region IDs as the 3D registry;
- hit targets remain usable at 360px and 200% zoom;
- selected state is visible without relying only on color;
- semantic buttons and SVG state remain synchronized;
- the map works with keyboard and screen reader;
- the chosen approach has complete provenance and replacement status.

Suggested budgets for prototype review, subject to measured device testing:

- Full-body locator GLB: target under 5 MB compressed.
- Regional GLB: target under 2 MB compressed.
- Motion GLB: target under 1.5 MB; 3 MB hard review threshold.
- Textures: prefer one small atlas and dimensions appropriate for mobile.

Do not increase budgets silently. Record exceptions with a reason and owner.

### Phase 3 — Exercise motion player

**Purpose:** prove one exercise can display a safe, understandable movement.

Start with one exercise whose written content and still/poster are available for internal review.

Tasks:

1. Render the approved or draft poster first to avoid blank media.
2. Load motion only after the exercise card is visible or the user requests playback.
3. Implement Play/Pause, Replay and Reset.
4. Pause when the document is hidden or the media leaves the viewport.
5. Handle load failure without layout shift; retain the poster.
6. Keep the written instructions, dosage and safety line adjacent to the motion.
7. Never alter clinical text to fit a motion asset.
8. Respect reduced motion by showing the poster and text, with explicit opt-in if appropriate.
9. Ensure the motion starts in the stated setup and returns to a clear end state.
10. Provide front/side view only when it improves comprehension and is reviewed.

Exit criteria:

- One exercise page works from a direct URL and an area route.
- Motion can be stopped and replayed deterministically.
- Poster-only fallback works with JavaScript disabled or media failure.
- No autoplay or unlabelled motion control remains.
- Prototype motion is blocked from patient publication.

### Phase 4 — Motion production pipeline

**Purpose:** create repeatable exercise animations rather than one-off demos.

Preferred order:

1. Manual Blender keyframes for simple, low-joint movements.
2. Temporary motion libraries for visual prototyping only.
3. FreeMoCap/Pose2Sim/EasyMocap experiments for capture acceleration.
4. Blender cleanup and retargeting for every captured result.
5. Clinician movement-fidelity review.
6. GLB export plus poster and optional MP4 preview.

Per-exercise production record:

```text
exercise ID
source demonstration
camera setup
model/rig version
motion method
cleanup notes
start pose
movement path
return path
view/camera
known limitations
review questions
clinician review state
```

The first test set should include:

- a small-range neck rotation or similar controlled movement;
- a shoulder elevation movement;
- a lower-limb movement with larger displacement.

This tests rotation, arm motion, balance/contact and camera framing before scaling to the whole
library.

### Phase 5 — Automated media gates

Add checks without weakening existing compliance rules:

- referenced file exists;
- GLB header and glTF version are valid;
- at least one animation clip exists for motion assets;
- poster exists and is renderable;
- file size and duration stay within budget;
- asset IDs are unique;
- source/license/attribution metadata exists;
- published content never references `prototype`, `draft` or `retired` media;
- approved media has genuine review metadata;
- motion and poster are not accidentally mixed between exercise IDs;
- missing media falls back or blocks publication according to the publication policy.

Fixtures must prove both failure and success paths. Do not report a check as passed if the runtime
cannot execute it.

### Phase 6 — Review surfaces and evidence

Create an isolated preview surface for internal work:

- noindex and unreachable from patient navigation;
- obvious `PROTOTYPE — NOT CLINICALLY REVIEWED` label;
- source and generation metadata visible to reviewers;
- side-by-side text, poster and motion;
- frame-by-frame or scrub review where practical;
- accept/reject notes without writing clinician names or dates automatically;
- contact sheet for multiple exercise assets;
- exportable evidence screenshots.

Required evidence for each visual module:

1. 360px portrait.
2. Desktop viewport.
3. Keyboard-only path.
4. Reduced-motion state.
5. WebGL failure/simple fallback.
6. Loading and asset-error states.
7. Direct exercise deep link.
8. Print/poster behavior.
9. Mobile performance measurement.
10. `git status --short` scope check.

### Phase 6A — Competitor workflow benchmark

Review competitors for interaction patterns only. Do not copy assets, wording, proprietary flows or
out-of-scope data collection.

Primary benchmarks:

- PhysiApp: clarity of movement parameters and patient exercise presentation;
- Rehab My Patient/Rehab Guru: body-first navigation and mobile region selection;
- Physiotec: connection between anatomy education and exercise media;
- HEP2go: simple printable handout structure;
- MedBridge: placement of patient education beside exercises.

Capture a short evidence matrix for these journeys:

| Journey              | Evaluation question                                          |
| -------------------- | ------------------------------------------------------------ |
| Direct exercise link | Is setup and context immediately understandable?             |
| Body selection       | Can a patient choose an area without diagnostic implication? |
| Motion controls      | Are play, pause, replay and parameters obvious?              |
| Mobile               | Are controls comfortably usable at phone width?              |
| Print                | Is the exercise understandable without motion?               |
| Failure              | Does the experience remain complete when media fails?        |

Explicitly exclude competitor features that conflict with the product contract: accounts, adherence
tracking, remote monitoring, prescriptions, telehealth, analytics and patient records.

### Phase 6B — RTL and localization readiness

Arabic clinical publication remains blocked until native clinical review, but the interface must not
make future RTL support expensive.

Tasks:

1. Audit logical CSS properties, component direction and text alignment.
2. Verify back/forward icons and directional cues are not semantically wrong in RTL.
3. Check canvas labels, overlays, modal controls and print layout under `dir="rtl"` using non-clinical
   placeholder interface strings only.
4. Keep model orientation labels clinically unambiguous; do not mirror anatomical left/right by
   accident when the page direction changes.
5. Preserve translation-ready technical fields without importing external multilingual exercise
   instructions.
6. Record all native-language and clinical-review dependencies before Arabic publication.

Exit criteria:

- the shell and controls remain usable in an RTL test state;
- anatomical orientation remains correct;
- no machine-generated Arabic clinical content is published.

### Phase 7 — Clinician and patient validation

Before any patient-facing publication:

1. Physiotherapist verifies model orientation and region boundaries.
2. Physiotherapist verifies poster setup, movement, side, range, tempo and return.
3. Medical/regulatory owner verifies stop-screen and disclaimer wording where required.
4. Five representative users complete the locator and direct-link journeys.
5. At least one low-power/WebGL-failure journey is observed.
6. Reviewers confirm that the visual result was not interpreted as diagnosis or personalized
   prescription.
7. Published content has review metadata and passes all build gates.

## 7. Gemini handoff points

Gemini/Antigravity may be used for prototype visual production when the task is bounded and the
output is clearly temporary. It must not invent clinical instructions or approve movement.

### Handoff A — Prototype visual style board

Request:

- produce 3–5 visual directions for a calm, inclusive, low-detail physiotherapy 3D human;
- show neutral pose, front/back orientation, selected-region highlight and mobile framing;
- do not add anatomy labels, diagnoses, claims or exercise advice;
- return image files plus prompts, generation settings, source references and replacement notes.

Use only to choose visual direction. The output is not a model and must not ship as clinical media.

### Handoff B — Temporary exercise storyboard

Request:

- create a non-clinical storyboard template for setup → movement → return;
- use a supplied exercise ID and clinician-provided movement description only;
- do not rewrite dosage, safety lines or instructions;
- identify uncertain poses as questions for the physiotherapist;
- return poster concepts and a shot list, not a claim that the movement is correct.

### Handoff C — Prototype motion/video reference

Request:

- generate a short internal visual reference only when a clinician-provided reference exists;
- preserve the supplied camera view, side and approximate timing;
- no face emphasis, no decorative camera movement, no extra repetitions and no invented range;
- label every result `PROTOTYPE — NOT CLINICALLY REVIEWED`;
- return MP4/WebM preview plus a still poster and provenance metadata.

Generative video must not become the final patient movement asset without manual reconstruction or
verification in a deterministic rig and separate clinician movement-fidelity approval.

### Handoff D — Blender/GLB preparation

Request:

- convert an approved temporary model or animation into a lightweight GLB;
- preserve logical region names and animation clip names;
- remove cameras/lights/unneeded materials;
- report triangle count, file size, texture dimensions, animation duration and export version;
- do not change the movement or clinical meaning.

## 8. Definition of done

The implementation is complete only when:

- the full-body 3D locator is an optional progressive enhancement over the complete simple route;
- broad selection highlights and zooms to the correct reviewed region;
- direct, semantic and fallback routes remain complete;
- one exercise has a deterministic, controllable motion demonstration;
- every motion asset has a poster and failure fallback;
- prototype/draft media cannot reach patient routes;
- automated model and motion checks run in a supported environment;
- visual, accessibility, performance and clinician evidence packets exist;
- temporary assets are either replaced, explicitly approved, or removed from publication;
- no `patient-library/` file changed;
- final `git status --short` contains only intentional work.

## 9. Immediate execution order

1. Stabilize and record the current visual baseline.
2. Run the MakeHuman/MPFB2 model spike and compare it with the current draft GLB.
3. Prepare the multi-source neck/shoulder anatomy reference packet.
4. Run the fallback SVG comparison and select one accessible approach.
5. Finish the full-body locator using the selected prototype GLB and complete fallback.
6. Create the isolated prototype registry, provenance fields and media gates.
7. Build one exercise motion player with a poster-first fallback.
8. Prepare one neck/shoulder motion prototype through Gemini or Blender, labelled draft.
9. Run competitor workflow and RTL-readiness audits.
10. Review the prototype in the app at mobile and desktop sizes.
11. Correct interaction/performance defects.
12. Send the movement and region packet to the physiotherapist for fidelity review.
13. Replace or approve the asset through the publication workflow.
14. Expand to two more exercises only after the first vertical slice passes review.

## 10. External resource boundary

External exercise datasets such as free-exercise-db, wger, workout-guide or Gym visual collections
may inform research, field comparisons and prototype layouts. They do not become the canonical
clinical schema or content source.

- Do not import external instructions, dosage, target muscles, safety text or exercise ranking.
- Do not create a second runtime exercise database.
- Propose any useful new media field through the existing sheet/schema governance first.
- Keep the Google Sheet contract and current validation pipeline authoritative.
- Use proprietary physiotherapy libraries only as coverage and UX references.
