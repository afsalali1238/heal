# Launch Decision Pack

**Prepared:** 2026-08-27  
**Status:** Product defaults approved for implementation planning; clinical, legal, regulatory, and
domain facts remain **unapproved** until the named human owner signs them off.

This pack prevents unanswered questions from stalling the build without pretending that an agent can
approve clinical or regulatory content. Builders may implement the structures and preview copy below.
Patient publication remains blocked wherever an approval row is open.

## Decision summary

| ID  | Proposed decision                                                                                   |         Build now | Publication owner                          |
| --- | --------------------------------------------------------------------------------------------------- | ----------------: | ------------------------------------------ |
| L1  | Position as clinician-guided patient education; apply the stricter advertising controls voluntarily |               Yes | Medical Director / regulatory adviser      |
| L2  | Urgent-care stop screen with jurisdiction placeholders and no onward exercise route                 |      Preview only | Medical Director                           |
| L3  | Plain-language educational disclaimer, persistent short line plus full page                         |      Preview only | Medical Director / legal adviser           |
| L4  | Controlled 3D renders first; licensed assets when a movement cannot be represented reliably         | Yes, draft assets | Clinician + product owner                  |
| L5  | Region-by-region rendered sign-off against front/back reference views                               |               Yes | Physiotherapist                            |
| L6  | Canonical domain pattern `handbook.<clinic-domain>`                                                 |   Configure later | Product owner / clinic                     |
| L7  | No inferred “Start here” ranking in v1                                                              |               Yes | Physiotherapist may enable later           |
| L8  | Hybrid information architecture: area chapter plus dedicated canonical exercise pages               |               Yes | Product owner; clinician reviews usability |

---

## L1 — Regulatory classification and accountable approver

### Proposed position

Treat Anatomy Explorer as **clinician-guided patient education and navigation**, not assessment,
diagnosis, triage, treatment selection, advertising, or a patient record. Until a written local
classification is obtained, voluntarily apply the stricter advertising constraints already encoded
by the compliance engine.

This is a product position, not a legal determination. Patient publication is blocked until the
Medical Director or an appropriately qualified regulatory adviser confirms the classification for
the clinic's jurisdiction and deployment model.

### Accountabilities

| Responsibility                                               | Accountable role                                  |
| ------------------------------------------------------------ | ------------------------------------------------- |
| Product scope, exclusions, UX, and technical controls        | Product owner                                     |
| Clinical content, dosage, mappings, movement fidelity        | Treating physiotherapist / clinical content owner |
| Regulatory classification and jurisdiction-sensitive wording | Medical Director or regulatory adviser            |
| Privacy/security implementation                              | Product owner, with clinic governance approval    |
| Final production release                                     | Product owner and Medical Director jointly        |

### Approval record

- Classification selected: `[UNAPPROVED]`
- Jurisdiction/regulator: `[UNAPPROVED]`
- Evidence/reference: `[UNAPPROVED]`
- Accountable approver: `[UNAPPROVED]`
- Approval date: `[UNAPPROVED]`

No agent may fill the approver or date.

---

## L2 — Emergency destination and exact stop-screen wording

### Behavior

- The stop screen replaces the exercise handoff; it is not a dismissible banner.
- It contains no exercise links, Continue action, booking CTA, or automatic redirection.
- Browser Back/Forward and direct routes must not bypass the stop within the active flow.
- Emergency number and clinic contact are configuration values, never embedded in component copy.
- If jurisdiction facts are unapproved, the production build must fail rather than show a guessed number.

### Proposed exact copy

**Heading:**

> Please stop here

**Body:**

> What you selected may need urgent medical assessment. Do not continue with this exercise guide.

**Primary instruction:**

> If you feel seriously unwell, your symptoms are severe, or you think this may be an emergency,
> contact your local emergency service now: **[APPROVED EMERGENCY DESTINATION]**.

**Secondary instruction:**

> Otherwise, stop the exercise and seek prompt advice from an appropriate healthcare professional.

**Uncertainty path:**

> If you are not sure, do not continue with the guide. Seek medical advice before exercising.

**Control:**

> Return to the handbook home

The return control may go only to the non-exercise home. It must not return directly to exercise content.

### Required approval

- Emergency destination/number: `[UNAPPROVED]`
- Clinic contact permitted on this screen: `[YES / NO — UNAPPROVED]`
- Exact wording approved: `[UNAPPROVED]`
- Medical Director approval: `[UNAPPROVED]`

---

## L3 — Final disclaimer wording

### Persistent short disclaimer

> This handbook provides general educational information. It does not diagnose, assess, or choose
> treatment for you. Follow only the exercises and instructions given to you by your physiotherapist.

### Exercise-page safety line

> Stop if the movement causes new, sharp, worsening, or unusual discomfort, or if you feel unwell.
> Seek advice from an appropriate healthcare professional before continuing.

### Full disclaimer draft

> **About this handbook**
>
> Anatomy Explorer is a general educational handbook. It helps you revisit body-area information and
> exercise instructions discussed with a physiotherapist. It does not provide a diagnosis, assessment,
> emergency service, or personalised treatment plan.
>
> **Using the exercises**
>
> Exercises are selected for individuals. Use only the items your physiotherapist directed you to use,
> and follow the dosage and safety instructions they gave you. A body-area selection, search result,
> link, or QR code does not mean an exercise is suitable for you.
>
> **When to stop**
>
> Stop if an exercise causes new, sharp, worsening, or unusual discomfort, or if you feel dizzy,
> weak, short of breath, numb, or otherwise unwell. Seek advice from an appropriate healthcare
> professional before continuing.
>
> **Urgent situations**
>
> Do not use this handbook for an urgent or emergency situation. Contact the approved local emergency
> service or seek urgent medical care.
>
> **Limits of the information**
>
> The handbook cannot consider your full health history, medication, pregnancy, recent procedures,
> injuries, or changes since your last assessment. Instructions given directly by an appropriate
> healthcare professional take priority over this material.
>
> **Content and availability**
>
> Content may be updated, corrected, retired, or temporarily unavailable. Media is provided to explain
> approved written instructions; when media and text differ, stop using the item and contact the clinic.

The Medical Director/legal adviser must approve any liability clause separately. Do not add broad
liability exclusions merely because they are common website language.

### Required approval

- Persistent line: `[UNAPPROVED]`
- Exercise safety line: `[UNAPPROVED]`
- Full disclaimer: `[UNAPPROVED]`
- Liability clause required: `[YES / NO — UNAPPROVED]`
- Approver/date: `[UNAPPROVED]`

---

## L4 — Approved media source and visual style

### Source decision

Use this hierarchy:

1. **Controlled rigged 3D render** from a fixed approved character and camera system.
2. **Licensed clinical illustration or footage** when 3D cannot represent equipment, contact, or
   movement detail reliably.
3. **Constrained AI-assisted still** only for internal drafts, with pose/reference controls and full
   clinician review.
4. **Never use unconstrained image-to-video** for patient movement demonstrations.

### Visual style

- Neutral adult figure with modest, non-branded clinical clothing.
- Calm realistic proportions; no exaggerated musculature, pain effects, glow, or alarming redness.
- Plain high-contrast background and fixed 4:3 exercise frame.
- Camera selected to reveal setup and movement direction; no decorative orbit, cuts, or zoom effects.
- Left/right and front/back orientation labelled when ambiguity is possible.
- Consistent figure, clothing, camera family, lighting, color meaning, and crop across the corpus.
- Anatomy locator may use translucent layers; exercise demonstrations remain externally readable.
- Still poster is mandatory; motion is optional, user-initiated, muted, pausable, and one repetition.

### Publication gate

Every asset records source/licence, model/version, prompt or scene file, exercise/item ID, view,
review status, reviewer fields, movement-fidelity result, alt text, checksum, and rejection reason.
Only explicitly approved assets reach patient routes.

---

## L5 — Clinician approval of body-region highlights

### Review method

For every supported region, provide four artifacts:

1. Front neutral full-body screenshot.
2. Back neutral full-body screenshot.
3. Selected highlight after camera zoom.
4. Semantic label and destination area shown beside the render.

The clinician reviews location, extent, side, front/back availability, overlap, label, and destination.
Technical mesh validity is not clinical approval.

### Sign-off matrix

| Region     | Front          | Back   | Side behavior | Highlight extent | Destination | Status     |
| ---------- | -------------- | ------ | ------------- | ---------------- | ----------- | ---------- |
| Neck       | review         | review | review        | review           | review      | Unapproved |
| Shoulder   | review         | review | review        | review           | review      | Unapproved |
| Elbow      | review         | review | review        | review           | review      | Unapproved |
| Wrist/hand | review         | review | review        | review           | review      | Unapproved |
| Hip        | review         | review | review        | review           | review      | Unapproved |
| Knee       | review         | review | review        | review           | review      | Unapproved |
| Ankle/foot | review         | review | review        | review           | review      | Unapproved |
| Lower back | not selectable | review | review        | review           | review      | Unapproved |

Approval is region-specific. One approved region does not approve the model globally.

---

## L6 — Production domain

### Proposed structure

- Canonical production: `https://handbook.<clinic-domain>/`
- Optional short QR domain: `https://go.<clinic-domain>/` using permanent server redirects only.
- Preview: platform-generated preview URL, protected from indexing.
- One canonical host; HTTPS only; `www` and alternate hosts redirect to it.

`handbook` is preferred over `pain`, `diagnosis`, `treatment`, or campaign language because it matches
the product's clinic-guided educational position.

### Required decision

- Clinic-owned base domain: `[UNAPPROVED / UNKNOWN]`
- Canonical hostname: `[UNAPPROVED]`
- QR short host required: `[YES / NO — UNAPPROVED]`
- Domain ownership verified: `[UNAPPROVED]`

Never buy or configure a domain until the product owner confirms ownership and naming.

---

## L7 — “Start here” exercise prioritization

### Decision

Do **not** show “Start here,” recommended, first, best, or priority items in v1 unless the clinician
explicitly selects them in the sheet for that area and section. Data order is presentation order,
not clinical priority. Locator selections must never rank exercises.

The initial implementation therefore shows all published reviewed items in clinician-controlled
head-to-toe/content order without a highlighted recommendation.

### Optional later schema

If approved, add `is_start_here`, `start_here_order`, and a short clinician-authored rationale.
Require at most two per area/section, published status, review metadata, and compliance validation.

---

## L8 — Flat area pages versus dedicated exercise pages

### Decision

Use a **hybrid structure**:

- The area page remains the handbook chapter: About, safety, Stretching, and Exercises.
- Every exercise also has a dedicated canonical page for sharing, QR, printing, bookmarking, and
  opening without the locator.
- Area cards link to the dedicated page while preserving a clear route back to the area chapter.
- A direct exercise page contains enough area context to prevent disorientation.
- Avoid duplicate indexable content: the dedicated page is canonical for the item; the area chapter
  uses a concise card/summary and link rather than duplicating the full body verbatim.

### Proposed routes

```text
/area/<area_id>/
/stretching/<area_id>/<item_id>/
/exercise/<area_id>/<item_id>/
```

This gives clinicians a precise stable link without sacrificing fast area browsing. IDs are permanent;
retired items keep a clear unavailable state or deliberate redirect rather than silently changing meaning.

---

## Final approval checklist

- [ ] L1 classification documented by accountable human.
- [ ] L2 emergency destination and wording approved.
- [ ] L3 disclaimer approved.
- [ ] L4 source/style approved after rejected examples are shown honestly.
- [ ] L5 first-region highlight approved on rendered mobile and desktop views.
- [ ] L6 domain owned and canonical host confirmed.
- [ ] L7 no-priority default accepted or explicit sheet fields approved.
- [ ] L8 hybrid page structure accepted after prototype review.

Until these boxes are closed, the product may be built and previewed but must not be described as
clinically approved, legally approved, or production-ready.
