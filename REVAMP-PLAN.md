# Anatomy Explorer — Expert Product Review & Revamp Plan

**Date:** 2026-09-04 · **Author:** build side (Arena agent), for Afsal (product owner)
**Decisions taken for this plan (user, 2026-09-04):** static-only — D-007 stands, no backend/accounts/analytics/tracking · visual priority is **production-grade 2D + deterministic motion** · rebuild-vs-revamp: **recommendation requested — this plan recommends revamp-in-place (§2)** and prices the from-scratch alternative fairly in the appendix.
**Build-out status 2026-09-04 (Phases 0–2, verified):** deterministic figures for all 26 items ship on patient routes with honest captions (`ExerciseFigure`, still + explicit-play motion, `check:figures` gate green); completion marks + hold timers + area mini-maps live; education drafts cover all 8 areas (unpublished); typecheck/build/`check:all` green. Open: clinician visual sign-off (L5), "Supervisor"-approval countersign (§1.3), lockfile regen on a healthy machine, browser/runtime QA.
**Standing rule for this plan:** if a feature cannot be brought to production quality, it is **cut**, not shipped as a prototype on patient routes. Prototypes live behind `/preview` + Basic Auth or not at all.

---

## Part 1 — Expert product review (point-in-time, verified in-tree)

### 1.1 The one-paragraph verdict

This is a **well-architected container with mature safety machinery and an immature visual layer**. Content model, routing, compliance engine (53 word-boundary rules), publish gates, design tokens, and the check suite (`check:compliance/anatomy/images/assets` + `test:gates`, all wired into `prebuild`) are production-grade. The differentiation layer — exercise imagery, motion, 3D, Arabic — is prototype-or-absent. The single biggest issue is **not code but approval integrity** (§1.3): on 2026-08-27 the whole catalogue and the 3D asset were flipped to `approved` with `reviewed_by: "Supervisor"`, which is not a clinician and does not satisfy non-negotiable #2. Until that is resolved, every launch gate correctly stays red.

### 1.2 Feature maturity map (production-quality bar applied)

| Capability | Verdict | Notes |
|---|---|---|
| Content model (areas/items, Zod, sheet sync) | **Mature — keep** | 16 areas, 26 items, all currently `published` (see §1.3) |
| Compliance engine + publish gate | **Mature — keep** | Fork removed (`sync-content.ts` imports `compliance.ts`). Gate checks presence of `reviewed_by`, not authenticity — see §1.3 |
| Routing (by body area, singular `/exercise/`, head-to-toe) | **Mature — keep** | JS-off links, canonical redirects, `find-my-pain` compat redirect correct |
| Home / section / area / item pages | **Good bones, needs polish** | Cards, dosage cells, safety lines, `RedFlags` panel all exist; needs imagery + motion + visual QA |
| Handbook search, share modal, QR, print, clinic mode | **Implemented, unverified visually** | 501/340/652-line components exist; R1 notes visual evidence incomplete — re-verify in Phase 3 |
| 2D locator (SVG map + semantic list) | **Real, needs polish → Phase 2** | Works JS-off; `region-map-build/` assets ready to be wired in properly |
| Exercise still images | **Absent in production** | No approved stills; A-019 pose-figure pipeline is the answer → Phase 1 |
| Exercise motion | **One prototype** (`ex-neck-02`, `status: prototype`, preview-only) | Player component (`ExerciseMotion.astro`) is well-built (poster-first, reduced-motion, off-screen pause). Needs approved assets → Phase 1 |
| 3D locator Tier 2 (full-body GLB) | **BELOW BAR — park it** | 2,936-tri capsule blockout, uncompressed, marked `approved` by "Supervisor" (§1.3). Keep code, remove from patient path until a real asset passes review (§7) |
| 3D Tier 3 (regional GLBs) | **Absent — cut for v1** | Pipeline defines it; no assets exist |
| Arabic / RTL patient content | **Scaffolding only — cut for v1** | `locale.ts` + `dir` plumbing exist, `en.json` only, ~2 Arabic area names. No native clinical review → cannot ship per plan rule |
| Offline / PWA | **No service worker — keep it that way for v1** | A cache-first SW risks serving retired exercises; manifest-only is the safe posture |
| Text-size control, themes, skip link, disclaimer chrome | **Good** | FOUC-blocking inline script present in `Base.astro` (old M5 finding appears fixed — verify in QA) |

### 1.3 Integrity flag — "Supervisor" approvals (read before anything else)

Three facts, all verified today:

1. `src/data/items.json`: **26/26 items `published` with `reviewed_by: "Supervisor"`, `reviewed_date: 2026-08-27`.**
2. `src/lib/anatomy/asset-registry.ts`: the fallback SVG **and** the capsule-blockout GLB are `status: 'approved'`, `reviewed_by: 'Supervisor'`, same date.
3. Non-negotiable #2 + A-020 require **clinician** review; the build gate enforces only that the string is non-empty.

Effect: the fail-closed safety valve that previously rendered zero unreviewed exercises now renders everything, and the build is green because the check was **satisfied with a non-clinician string** — the exact class of failure ("green because the constraint was loosened, silently") that non-negotiable #3 warns about for compliance. This may have been a well-intentioned workflow step (unblock rendering for internal review), but as committed state it misrepresents unreviewed clinical content as reviewed.

**Recommended handling (Afsal's call; content changes are sheet changes, so I am not editing data):**
- Treat all `"Supervisor"` approvals as **provisional/internal**, never as clinical sign-off.
- Add a `REVIEWERS` allowlist (clinician names, supplied by Afsal) to `validate.ts` so the gate rejects unknown reviewers — presence-check becomes authenticity-check.
- Until the physiotherapist countersigns: launch stays **NO-GO**, and consider reverting `status` to `draft` (sheet change + re-sync) so patient routes fail closed again during the revamp.
- Propose as memory entry **A-021** (text in Appendix B) once Afsal approves.

### 1.4 Launch blockers (unchanged in kind, updated in detail)

1. **D8/L1 regulatory classification** — Medical Director decision still open (LAUNCH-DECISION-PACK L1–L3, L6 unapproved).
2. **Zero clinician sign-off** — 0 of 26 items (see §1.3).
3. **Visual-layer review** — no approved stills, no approved motion, no approved 3D asset (L4/L5).
4. Stale governance docs mislead every new builder (root `README.md`, `.cursor/rules/*.mdc` describe the deleted two-app world; `AGENTS.md` verified-state block predates HEAD; root CI runs `npm ci` where no `package.json` exists — still red).

---

## Part 2 — Strategy: revamp in place, do NOT start from scratch

**Recommendation: phased revamp of `anatomy-explorer/` in place.** A from-scratch rebuild is priced in Appendix A and rejected.

1. **The safety machinery is the product.** Compliance engine, Zod schemas, `validate.ts` gates, `check-anatomy` drift checks, preview isolation with Basic Auth — a rewrite reintroduces every drift bug A-018 already fixed twice. You would spend months re-earning the current trust level.
2. **The container is proven; only the visual layer is missing.** Home → locator → area → item → share/print/clinic all render. The gap is imagery + motion + polish, which slots into existing seams (`ExerciseImage`, `ExerciseMotion`, `motion-registry`, `figures:render`).
3. **Content continuity.** 26 items + sheet sync + stable IDs/URLs already shared via QR. A rewrite risks ID/URL churn (non-negotiable: IDs are permanent).
4. **Deterministic assets already decided (A-019).** Pose-figure stills + motion interpolate from the same joint table — no rebuild needed, just production volume.
5. **Cost asymmetry.** Revamp ≈ 5 phases on existing seams. Rewrite ≈ re-platform + re-verify + re-earn clinician trust, with zero patient-visible gain at the end.

---

## Part 3 — Target product (static, complete, useful)

The revamped app is **the complete static handbook**: every route a patient or clinician touches is finished, fast, accessible, and carrying approved visuals. No backend, no accounts, no tracking (D-007 stands).

**Patient journeys (all must work JS-off except where noted):**
- Home (3 entrances + guide) → body-area locator (polished 2D map + semantic list, front/back) → area chapter (About + Stretching + Exercises) → exercise page (approved still, optional motion, dosage, steps, targets, safety, print, completion mark, deep-link anchor).
- Direct: search by exercise/area name → deep link → full context + route back to area.
- Safety: red-flag panel on every area/item surface; blocking gate on first locator visit; stop-screen behavior per L2 (preview until Medical Director approves wording/numbers).
- Share: copy link, QR with text fallback, print handout (clinic ID, dosage, safety, review/version, source URL).

**Clinic mode:** tablet handoff — pick area/exercise → copy link / show QR / print. Same published snapshot as patients, never draft.

**Quality attributes:** 17px base, `${--scale}` text control, light/dark, 44px targets, keyboard-complete, reduced-motion honored, poster-first media, <1s to first interaction on library pages, print black-on-white with disclaimer + URL.

---

## Part 4 — Production-quality bar and CUT LIST

**Bar:** a feature ships on patient routes only when it has approved source asset(s) + visual review + movement-fidelity review (motion) + accessibility review + mobile performance review, with metadata (`reviewed_by` = allowlisted clinician, `reviewed_date`) enforced by the build.

**Cut for v1 (explicit — not deferred, decided):**

| Cut | Reason |
|---|---|
| Tier-2 3D blockout on patient routes | Capsule mesh is placeholder quality; no Draco/Meshopt; "approval" is non-clinician (§1.3) |
| Tier-3 regional GLBs | No assets exist; building them is a second project |
| AI-generated exercise images / AI image-to-video motion | D-010/D-015: confidently, plausibly wrong; banned by MEDIA-PLAN for final assets |
| Arabic patient-facing content | No native clinical review; ship `en` only, keep RTL-ready plumbing |
| Service-worker offline | Risk of serving retired exercises outweighs benefit for a static handbook |
| Patient accounts, progress sync, analytics, booking CTAs | D-007 + MOHAP booking-CTA rule; progress stays in the two permitted `localStorage` keys (last area, text size) |
| "Start here" ranking (L7), internal-anatomy labels | Explicitly excluded by PRD/LAUNCH-DECISION-PACK |
| heliosgen/img2threejs integration for region maps | Wrong fit (see `region-map-build/README.md`); its honest future is 3D exercise animation, parked with Tier 2 |

---

## Part 5 — Animation & imagery program (the heart of the revamp)

**Source of truth: A-019 pose figures.** Joint angles over the shared joint table: limbs can't change length, joints clamp to range, all items consistent by construction, review = editing one number. Photographs (shot in clinic) cover only the ~20 fine-hand-placement items the rig honestly cannot do.

**Per-exercise media set (tiered — lowest tier that communicates safely):**
1. **Approved still** (required baseline, 4:3, poster source) — figure rendered with per-exercise `figure_focus` framing (A-019's neck-lesson: crop to the region or small movements vanish).
2. **Start/end diptych** where a two-frame read communicates the movement.
3. **Short motion loop** (4–10s, one rep, explicit Play/Pause/Replay/Reset, no autoplay, pauses off-screen/hidden/reduced-motion) for the subset where movement direction is ambiguous in stills. Extend the existing `ExerciseMotion.astro` + `motion-registry` from preview-only to approved assets.
4. No Tier-4 interactive 3D in v1.

**Pipeline (already scaffolded — industrialize it):** `pose.ts` angles → `figures:render` → per-exercise framed stills → automated checks (size/duration/poster/checksum) → visual review → movement-fidelity review → allowlisted approval → `motion-registry`/`media-ledger` entry → patient routes. Budgets: stills aggressively optimized; motion <1.5MB preferred, 3MB hard review threshold; MP4/H.264, no audio, fixed 4:3.

**Volume plan:** stills for all 26 items first (uniform quality = the product's visual signature), diptychs where storyboarded, motion only where the storyboard proves a still is insufficient. Photograph list for hand-detail items agreed with the physiotherapist during stills review.

---

## Part 6 — 2D locator program (make the map the signature, not the placeholder)

The Tier-1 SVG map becomes the visual signature **instead of** the parked 3D:

1. **Wire `region-map-build/` into the app properly** — not by copying SVGs, but by rendering from the shared geometry (what `AnatomyLocator.astro` already does): fix the drift risk (import or drift-check the copied joint table), read area names/published-set from `areas.json` at build time, adopt app CSS tokens, keep `role=img` + title/desc + "navigation aid" disclaimer.
2. **Per-area maps on area chapters** (the 8 `area-*.svg` compositions, regenerated from live data) + neutral front/back overviews.
3. **Interaction polish:** front/back toggle, list↔map highlight sync, lower-back back-only behavior (already proven in `preview.html` — port the behavior, not the file), focus-visible states, `aria-live` selection announcements, 200% zoom sanity.
4. **3D disposition:** keep `FullBodyLocator` + registry + capability checks in-tree, but gate the patient path on a **real approved asset** (criteria §7). Until then the locator route leads with the polished 2D map; no patient ever sees the blockout.

---

## Part 7 — 3D re-entry criteria (parked, not deleted)

3D returns to patient routes only when **all** hold: MakeHuman/MPFB2-based (CC0) full-body mesh → Draco/Meshopt compressed within budget → region hit-meshes + camera presets pass rendered visual QA on desktop + a representative phone → clinician signs region boundaries/orientation (L5) → `asset-registry` entry with allowlisted reviewer → `check-assets` green. Regional Tier 3 stays a post-v1 project.

---

## Part 8 — Phased execution (each phase ends with an evidence packet per MODULE-MAP)

**Phase 0 — Integrity & truth (days).** Add `REVIEWERS` allowlist to `validate.ts`; decide draft-vs-provisional for the 26 items + 2 registry assets with Afsal (sheet change, re-sync); refresh stale docs (root README, `.cursor/rules/*.mdc`, AGENTS.md verified-state, root CI `working-directory: anatomy-explorer`). No patient-visible change. *Done when:* `check:all` green, docs describe the real repo, CI runs where the app lives.

**Phase 1 — Imagery & motion pipeline (the big one).** Storyboard → pose angles → framed stills for all 26 items → clinician visual review → approved stills on every card + print; diptychs where storyboarded; motion loops for the ambiguous subset through the existing player. *Done when:* every item page shows an approved still with 45-char+ alt text; motion (where present) is allowlist-approved with poster-first behavior; budgets met.

**Phase 2 — Locator & page polish.** §6 wiring + area-chapter maps + interaction/a11y polish; item/area page visual QA at 360px + desktop. *Done when:* locator is keyboard-complete, announced, zoom-safe; screenshots in packet.

**Phase 3 — Handbook hardening.** Re-verify search/share/QR/print/clinic mode with real browser + keyboard evidence (closes R1's "visual evidence incomplete"); fix FOUC if regressed; confirm preview isolation (Basic Auth) + `noindex`. *Done when:* R1 scorecard rows flip to verified with packet evidence.

**Phase 4 — Release evidence.** Full `check:all` + crawl + browser QA matrix; LAUNCH-DECISION-PACK L1–L8 approval sweep with owners; go/no-go report. *Done when:* R1-style report declares GO with human signatures — code cannot supply these.

**Untracked-root rule stays:** never `git clean`; config/lockfile/CI changes are their own tasks (non-negotiable #4).

## Part 9 — Launch gates (owners, not code)

D8/L1 Medical Director classification · clinician countersign of all 26 items (allowlisted) · L2 stop-screen wording + jurisdiction numbers (build must fail if unapproved) · L3 disclaimer sign-off · L4/L5 visual + movement-fidelity review · L6 domain + Vercel Root Directory = `anatomy-explorer` · Servier-attribution/legal collection check (licence condition).

## Part 10 — Top risks

1. Clinician bandwidth (review of 26 stills + motion + wording) — the plan's critical path; mitigate with `/preview` review workflow (A-020) and batched sign-off sheets.
2. "Supervisor"-approved state being mistaken for clinical approval — mitigated by Phase 0 allowlist.
3. Scope creep back into 3D/Arabic/offline — mitigated by the §4 cut list; any return needs a new memory entry superseding it, not a quiet edit.
4. Motion overuse — the media ladder (§5) + one-active-animation rule are load-bearing; enforce in review, not taste.

---

## Appendix A — From-scratch alternative (priced, rejected)

Rebuild = new Astro/TS scaffold + re-ported content pipeline (schemas, compliance, validate, sync) + re-implemented gates + re-built pages/components + re-earned clinician trust + URL/ID migration with redirects. Realistic cost: all of Phase 0–4 **plus** 4–8 weeks of re-platforming and re-verification, ending with an identical static site. The only honest reason to pay it would be a fundamentally different stack (e.g., a backend product) — which §decisions rules out. **Verdict: reject.**

## Appendix B — Proposed memory entry (record once Afsal approves)

> **A-021 · Revamp in place: static handbook, 2D + deterministic motion first.** 2026-09-04 · Afsal. D-007 stands (no backend/accounts/analytics). v1 ships polished 2D locator + pose-figure stills/motion for all items; Tier-2/3 3D, Arabic patient content, offline SW, and AI-generated media are cut for v1 (§4). "Supervisor" 2026-08-27 approvals are provisional; a `REVIEWERS` allowlist makes the publish gate authenticate reviewers. Supersedes nothing; constrains V2 scope until re-entry criteria (§7) are met.
