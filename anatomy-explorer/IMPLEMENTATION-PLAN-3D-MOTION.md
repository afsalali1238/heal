# Anatomy Explorer — 3D Locator and Exercise Motion Implementation Plan

**Status:** Prototype implementation plan  
**Date:** 2026-08-27  
**Scope:** Full-body 3D entry experience, body-area selection, exercise movement media, asset production, validation, and review workflow

## 1. Outcome

Build a working private prototype with this complete path:

```text
Home
  → Find a body area
  → 3D full-body model
  → broad region selection
  → optional regional view
  → safety/confirmation flow
  → area handbook
  → exercise card
  → animated movement demonstration
```

The prototype may use temporary third-party models, motion clips, illustrations, and generated
media to prove the interaction. Temporary assets must be labelled `prototype`, isolated from
published patient routes, and listed in the asset ledger so they can be replaced later.

Clinical text remains sourced from the Google Sheet and existing validated snapshot. This plan does
not authorize inventing exercise instructions, dosages, safety wording, diagnoses, or reviewer data.

## 2. Product principles

1. The 3D human is a spatial navigation and education surface, never a diagnostic engine.
2. Text remains authoritative; animation demonstrates position and direction.
3. Every 3D control has an equivalent semantic control.
4. The simple 2D map is always available and remains functional when WebGL fails.
5. Prototype media can accelerate development but cannot silently become published media.
6. Deterministic rigged animation is the preferred final movement source.
7. AI image-to-video is useful for concepts and internal experiments, not as the final movement authority.
8. The browser loads only the assets required for the current step.
9. No analytics, accounts, tracking, backend, or user health storage is added.
10. `patient-library/` remains reference-only and is never edited.

## 3. Recommended technology stack

### Patient-facing application

- Astro and TypeScript for static routes and content rendering.
- Three.js for the anatomy canvas and GLB animation playback.
- `GLTFLoader` for GLB/GLTF loading.
- `AnimationMixer` and `AnimationAction` for exercise clips.
- Anime.js only for DOM/UI transitions, not skeleton movement.
- GLB with Meshopt or Draco geometry compression where compatible.
- WebP/AVIF posters, with JPEG fallback where required.
- Native `<video>` only as a fallback or alternate approved media format.

### Private asset-production workstation

- Blender for modelling, rigging, animation cleanup, retargeting, camera framing, and GLB export.
- Mesh2Motion for rapid prototype retargeting and GLB animation experiments.
- FreeMoCap for the first local motion-capture experiment.
- Pose2Sim for a more controlled multi-camera or biomechanics-oriented experiment.
- EasyMocap and OpenCap Monocular as research alternatives only; do not make them runtime dependencies.
- MediaPipe/BlazePose for lightweight landmark experiments where useful.

### Temporary references

- Workout Guide for exercise-card and start/middle/end illustration references.
- Exercises Dataset and openGym for interaction and media-browser ideas only.
- Khronos glTF Sample Assets for loader, animation, compression, and disposal tests.

## 4. System architecture

```text
Astro page
  ├── semantic region/exercise controls
  ├── simple SVG fallback
  └── client island
        ├── capability policy
        ├── renderer adapter
        ├── asset loader/cache
        ├── camera controller
        ├── selection/raycast controller
        ├── highlight controller
        ├── animation player
        ├── reduced-motion policy
        └── accessibility bridge
```

The anatomy and exercise systems share a visual asset contract but remain separate concerns:

```text
Anatomy model → selects a library area
Exercise motion → demonstrates an existing library item
```

Neither system duplicates clinical prose or changes dosage.

## 5. Asset tiers

### Tier 0 — semantic/simple fallback

Required on every locator route:

- Front/back SVG or illustrated body map.
- Region buttons with stable IDs.
- Text labels and selected-state announcements.
- Keyboard-complete navigation.
- No WebGL dependency.

### Tier 1 — full-body locator

One neutral-pose GLB used for broad body-area selection:

- Separate selectable region meshes or enlarged hit meshes.
- Stable logical IDs independent of Blender mesh names.
- Front and back camera presets.
- Neutral materials and restrained highlight treatment.
- No internal anatomy claims in the initial prototype.

### Tier 2 — regional detail

Loaded only after a broad selection:

- Region-specific geometry.
- Reviewed exact-zone meshes only where there is a meaningful content difference.
- Camera target and position metadata.
- Optional educational layers, initially disabled unless reviewed.

### Tier 3 — exercise motion

Loaded only on an exercise route or when the user explicitly opens the demonstration:

- Rigged character GLB or a short approved video.
- One clear start pose and one controlled repetition.
- Poster image from the same source.
- No autoplay.
- No audio in v1.

## 6. Proposed data contracts

The existing schema already includes anatomy and motion fields. Keep those fields and add only
implementation metadata where needed.

```ts
type VisualAssetStatus = 'prototype' | 'draft' | 'approved' | 'retired';

type MotionAsset = {
  id: string;
  exerciseId: string;
  kind: 'rigged-glb' | 'video' | 'illustration';
  motionUrl?: string;
  posterUrl: string;
  previewUrl?: string;
  durationSeconds?: number;
  loop: boolean;
  cameraView: 'front' | 'side' | 'three-quarter';
  sourceUrl: string;
  sourceMethod:
    | 'manual-blender'
    | 'mesh2motion'
    | 'freemocap'
    | 'pose2sim'
    | 'licensed-video'
    | 'temporary-reference';
  status: VisualAssetStatus;
  reviewedBy: string;
  reviewedDate: string;
  visualReviewedBy: string;
  visualReviewedDate: string;
  replacementRequired: boolean;
  notesInternal: string;
};
```

Prototype values must use empty review fields and `replacementRequired: true` where the asset is
not intended for release.

## 7. File layout

```text
anatomy-explorer/
├── public/
│   ├── anatomy/
│   │   ├── models/
│   │   │   ├── human-body-locator.glb
│   │   │   └── regional/
│   │   ├── fallback/
│   │   └── posters/
│   └── exercise-media/
│       ├── prototype/
│       │   └── <motion-id>/
│       │       ├── motion.glb
│       │       ├── poster.webp
│       │       └── preview.mp4
│       └── approved/
│           └── <motion-id>/
├── src/
│   ├── components/
│   │   ├── anatomy/
│   │   │   ├── AnatomyCanvas.astro
│   │   │   ├── AnatomyCanvas.ts
│   │   │   ├── RegionControls.astro
│   │   │   ├── SimpleBodyMap.astro
│   │   │   └── RegionalScene.astro
│   │   └── motion/
│   │       ├── ExerciseMotion.astro
│   │       ├── ExerciseMotionPlayer.ts
│   │       └── MotionPoster.astro
│   ├── lib/
│   │   ├── anatomy/
│   │   │   ├── capabilities.ts
│   │   │   ├── camera-presets.ts
│   │   │   ├── highlight-controller.ts
│   │   │   ├── selection-controller.ts
│   │   │   └── renderer-adapter.ts
│   │   └── motion/
│   │       ├── animation-manifest.ts
│   │       ├── motion-player.ts
│   │       └── motion-policy.ts
│   └── data/anatomy/
│       └── assets.ts
└── scripts/
    ├── check-motion-assets.ts
    ├── generate-motion-preview.ts
    ├── inspect-glb.ts
    └── build-asset-ledger.ts
```

Use the current existing files and ownership boundaries where they already provide equivalent
functionality. Do not create parallel registries for the same asset.

## 8. Implementation phases

### Phase A — Baseline and asset ledger

Goal: make temporary media safe to use during private development.

Tasks:

1. Inventory current GLB, image, poster, and motion-related files.
2. Create one asset ledger with source, method, status, replacement flag, hash, size, and notes.
3. Mark current draft model and any borrowed media as `prototype` or `draft`.
4. Ensure prototype media is not returned by published library queries.
5. Add a build check that rejects a prototype asset on a published patient route.
6. Add a visible internal preview badge only on unlisted preview/clinic surfaces.

Exit criteria:

- Every media file has a ledger entry.
- Missing or unregistered assets fail deliberately.
- Published content cannot reference prototype media.

### Phase B — Full-body 3D locator

Goal: replace the temporary neck-only proof with a complete navigable body.

Tasks:

1. Confirm full-body GLB coordinate system, scale, origin, and neutral pose.
2. Name or map broad meshes for head/neck, shoulder/arm, upper back, lower back, hip, knee, ankle/foot, and other published regions.
3. Create enlarged invisible hit meshes where direct geometry selection is difficult.
4. Add a logical mesh-to-region mapping file.
5. Implement front, back, reset, constrained orbit, and zoom-to-region.
6. Implement highlight state with tint, outline, and text state.
7. Add selection debounce and cancellable camera transitions.
8. Keep the semantic region list in the DOM at all times.
9. Add simple-view fallback and a user-visible switch between 3D and simple view.
10. Add reduced-motion behavior: no animated camera flight and no pulsing highlight.

Exit criteria:

- A keyboard user can reach every published region without touching the canvas.
- A pointer user can select, change view, reset, and reach the mapped area.
- WebGL failure leaves the complete simple flow usable.

### Phase C — Regional detail and confirmation

Goal: make a broad selection useful without forcing precision.

Tasks:

1. Define which regions need regional detail based on available published content.
2. Load regional GLBs only after explicit region selection.
3. Preserve the broad selection while the regional asset loads.
4. Add exact zones only where approved mappings change the resulting content.
5. Show a semantic zone list synchronized with the regional scene.
6. Keep “I’m not sure” and broad-region continuation available.
7. Verify that zone selection does not imply diagnosis or a cause.

Exit criteria:

- No region is a dead end.
- Missing regional media falls back to the broad region and simple map.
- Exact zones are not shown merely because geometry exists.

### Phase D — Exercise motion player

Goal: display one animated exercise safely and consistently.

Tasks:

1. Choose one existing local exercise with appropriate draft/approved status.
2. Add a temporary motion manifest entry with `status: prototype`.
3. Load a rigged GLB with `GLTFLoader` and inspect available animation clips.
4. Implement a single `AnimationMixer` per player.
5. Add play, pause, replay, reset, and explicit loading/error states.
6. Start with a poster; never show an empty canvas as the first frame.
7. Pause when the tab is hidden or the player leaves the viewport.
8. Stop/dispose the mixer, geometries, materials, and textures on teardown.
9. Add a native video/poster fallback path.
10. Use the same player on direct item pages, area pages, print views, and clinician preview where appropriate.

Exit criteria:

- The exercise page remains useful if JavaScript or WebGL fails.
- One movement starts in a stable pose and loops predictably.
- Reduced motion shows the poster and text without automatic movement.

### Phase E — Produce the first motion set

Goal: test whether the pipeline scales beyond one exercise.

Create three prototypes with different motion profiles:

1. Small-range neck movement.
2. Shoulder/arm elevation.
3. Lower-limb movement with clear weight/contact.

For each:

1. Capture or keyframe the start pose.
2. Capture one controlled repetition.
3. Remove unnecessary frames and secondary motion.
4. Retarget and clean the rig in Blender.
5. Render a poster and a short preview.
6. Record the source method and known limitations.
7. Compare manual animation against FreeMoCap output.
8. Send the movement for clinician review before calling it approved.

Exit criteria:

- The same manifest/player works for all three.
- Camera framing and controls are reusable.
- Motion-specific review findings are recorded rather than hidden.

### Phase F — Motion-capture-assisted production

Goal: determine whether capture reduces production time.

Test one exercise with each suitable local tool:

```text
Phone video
  → FreeMoCap
  → BVH/landmark output
  → Blender retargeting
  → manual cleanup
  → GLB export
```

Then compare with:

```text
Phone video
  → Pose2Sim or EasyMocap experiment
  → OpenSim/BVH/motion output
  → Blender retargeting
  → manual cleanup
  → GLB export
```

Measure:

- Setup time.
- Processing time.
- Cleanup time.
- Number of visible joint errors.
- Range-of-motion accuracy.
- Foot/floor stability.
- Retargeting effort.
- Clinician review changes.

Decision rule: use capture only when it is faster than manual keyframing after cleanup and does not
reduce movement fidelity.

### Phase G — Hardening and replacement

Goal: convert the prototype into releasable infrastructure.

Tasks:

1. Replace temporary model with an asset whose redistribution rights are confirmed.
2. Replace temporary animations with original or properly licensed source assets.
3. Replace borrowed posters and illustrations or document their rights.
4. Add all required attribution and credits.
5. Remove prototype assets from patient-build input.
6. Require visual and movement review metadata for approved motion.
7. Run mobile, desktop, keyboard, reduced-motion, and WebGL-failure QA.
8. Confirm direct exercise links, QR links, print views, and area routes.
9. Run asset, anatomy, compliance, typecheck, route, and browser checks.
10. Record unresolved issues in the release evidence packet.

## 9. Motion production standards

Each exercise motion should be authored as a short teaching demonstration, not as a cinematic clip.

Recommended v1 defaults:

- 4–10 seconds.
- One repetition per loop.
- Fixed 4:3 camera frame.
- No sound.
- Neutral background.
- Clear start pose.
- Controlled tempo.
- One camera angle unless a second angle materially improves understanding.
- Poster generated from the approved start pose.
- Text instructions visible beside the animation.

The animation must not show exaggerated range, speed, resistance, or form that is absent from the
clinician-owned content.

## 10. Runtime behavior

### Loading

```text
HTML + text + simple map
  → capability check
  → full-body GLB
  → selected regional GLB
  → explicit exercise motion
```

Each upgrade is optional. A failed upgrade keeps the previous working surface.

### Performance targets

- Simple map interaction: under 1 second.
- Initial anatomy JavaScript: under 250 KB compressed before model assets.
- Full-body model: preferably 2–5.5 MB compressed; 8 MB hard review threshold.
- Regional model: preferably 2–6 MB compressed.
- Motion asset: preferably below 1.5 MB; 3 MB hard review threshold.
- Supported devices: target 45 fps or better.
- Dispose regional and motion resources when no longer needed.

### Accessibility

- All actions available as semantic buttons/links.
- Canvas has a concise accessible label and status region.
- Selected region is announced without relying on color.
- Keyboard can change front/back view, reset, select regions, and continue.
- Reduced-motion preference disables camera travel and automatic playback.
- Poster and text remain complete fallbacks.

## 11. Validation and release gates

### Automated asset checks

- File exists.
- Correct extension and MIME type.
- Valid GLB header/version.
- At least one animation clip for rigged motion.
- Triangle, texture, byte-size, and duration limits.
- Required poster exists.
- Manifest and ledger IDs are unique.
- Prototype assets cannot be referenced by published rows.
- Approved assets contain review metadata.

### Visual QA

Capture screenshots for:

- Full-body front view.
- Full-body back view.
- Each published region focus.
- Loading state.
- WebGL failure/simple view.
- Exercise poster.
- Exercise playing.
- Exercise paused.
- Reduced-motion state.
- 360px and desktop widths.

Inspect for framing, wrong-side mapping, floating labels, clipped meshes, unreadable controls,
unexpected auto-play, and mismatch between text and movement.

### Clinical/movement review

The clinician or designated reviewer must check:

- Starting position.
- Direction of movement.
- Range of movement.
- Tempo.
- Return phase.
- Body support/contact.
- Whether the animation could be misunderstood as a diagnosis or personalized prescription.

An asset can be technically complete and still remain `draft`.

## 12. Prototype asset register

Maintain a table like this in the internal asset ledger:

| Asset             | Temporary source            | Used for             | Status    | Replace before release   |
| ----------------- | --------------------------- | -------------------- | --------- | ------------------------ |
| Full-body locator | Current draft GLB           | Region selection     | prototype | Yes                      |
| Neck motion       | Blender/Mesh2Motion test    | Player proof         | prototype | Yes or clinician approve |
| Shoulder motion   | Temporary capture/animation | Pipeline test        | prototype | Yes or clinician approve |
| Lower-limb motion | Temporary capture/animation | Pipeline test        | prototype | Yes or clinician approve |
| Exercise poster   | Rendered from prototype     | First-frame fallback | prototype | Yes or clinician approve |

## 13. Immediate execution order

1. Finish the existing 3D locator vertical slice using the current draft GLB.
2. Add the asset ledger and prototype-only publication guard.
3. Make full-body front/back selection work with semantic controls.
4. Add one regional zoom path, starting with the existing neck slice.
5. Add the exercise motion player to one exercise route.
6. Create one temporary neck movement clip and poster.
7. Verify playback, pause, replay, reduced motion, fallback, and disposal.
8. Create shoulder and lower-limb prototype clips.
9. Test FreeMoCap against manual Blender animation.
10. Record findings and choose the production motion method.
11. Expand only after the first three motion prototypes pass technical review.

## 14. Definition of done for the prototype

The prototype is complete when:

- The full-body model loads after the simple map.
- Front/back and region selection work.
- Every selected region maps to a real area or a deliberate unavailable state.
- The neck regional slice loads on demand.
- One exercise opens with a poster and plays a temporary GLB movement.
- Play, pause, replay, reset, fallback, and reduced-motion behavior work.
- Prototype assets are visibly and technically isolated from published content.
- Asset checks fail on missing/oversized/unregistered media.
- The same behavior works on direct exercise routes and the 3D locator flow.
- `patient-library/` is unchanged.
- The final `git status --short` contains only intentional prototype-plan changes.

## 15. Definition of done for release

Release requires all prototype media to be replaced or rights-cleared, published clinical content to
have clinician metadata, motion fidelity to be reviewed, all automated gates to pass, all required
visual/accessibility evidence to exist, and the clinician to approve the relevant patient-facing
model, mappings, posters, and movement clips.
