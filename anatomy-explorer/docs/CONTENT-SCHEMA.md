# Content Schema — the spreadsheet contract

The Google Sheet is the source of truth. This file defines exactly what the sync script expects. If the sheet and this file disagree, the build fails and names the offending row.

Two tabs: **`areas`** and **`items`**.

Rules that apply everywhere:

- **Never rename a column header.** The script reads by header name.
- **Never reuse an `id`.** Ids are permanent. Retire a row by setting `status` to `retired`, don't delete it — old links stay alive.
- Blank cells are blank, not `-` or `n/a`. The script treats empty as empty.
- Slugs are lowercase, hyphenated, ASCII: `lower-back`, not `Lower Back`.
- Numbers are plain numbers: `30`, not `30 sec` or `30s`.

---

## Tab: `areas`

One row per body area, per section. `neck` appears twice — once for stretching, once for exercises — because the two sections can have different area lists.

| Column           | Type    | Required | Notes                                                      |
| ---------------- | ------- | -------- | ---------------------------------------------------------- |
| `area_id`        | slug    | yes      | `neck`, `lower-back`, `hamstrings`                         |
| `section`        | enum    | yes      | `stretching` \| `exercise`                                 |
| `name_en`        | text    | yes      | Display name: `Lower Back`                                 |
| `name_ar`        | text    | no       | Leave empty until Arabic phase                             |
| `order`          | integer | yes      | Position in the grid. Group related areas near each other. |
| `status`         | enum    | yes      | `published` \| `draft` \| `retired`                        |
| `notes_internal` | text    | no       | Never shown to patients                                    |

Composite key is `section` + `area_id`. That pair must be unique.

---

## Tab: `items`

One row per stretch or exercise.

### Identity

| Column    | Type    | Required | Notes                                                               |
| --------- | ------- | -------- | ------------------------------------------------------------------- |
| `id`      | slug    | yes      | `str-neck-02`, `ex-shoulder-04`. Prefix `str-` or `ex-`. Permanent. |
| `section` | enum    | yes      | `stretching` \| `exercise`                                          |
| `area_id` | slug    | yes      | Must exist in the `areas` tab with the same `section`               |
| `order`   | integer | yes      | Order within the area. Warm-up first.                               |
| `status`  | enum    | yes      | `published` \| `draft` \| `retired`                                 |

### Naming and classification

| Column    | Type | Required          | Notes                                                  |
| --------- | ---- | ----------------- | ------------------------------------------------------ |
| `name_en` | text | yes               | Plain name. `Chin Tuck`, not `Cranio-cervical flexion` |
| `name_ar` | text | no                | Arabic phase                                           |
| `type`    | enum | yes for exercises | See list below. Blank for stretches.                   |

`type` values: `range-of-motion` · `mobility` · `isometric` · `concentric` · `eccentric` · `isokinetic` · `stabilisation` · `activation` · `offloading` · `strengthening` · `functional`

This drives the coloured chip on the card and tells the patient at a glance what kind of work it is.

### Instructions

Written for a patient alone at home. Short sentences. Second person. No abbreviations.

| Column              | Type | Required       | Notes                                                                     |
| ------------------- | ---- | -------------- | ------------------------------------------------------------------------- |
| `start_position_en` | text | yes            | Where the body starts. `Sit upright with both feet flat on the floor.`    |
| `movement_en`       | text | yes            | What to do. One or two sentences.                                         |
| `direction_en`      | text | stretches: yes | Which way the movement goes. `Tilt your head toward your right shoulder.` |
| `return_en`         | text | exercises: yes | How to come back. `Slowly lower to the starting position.`                |
| `safety_en`         | text | yes            | One line. `Stop if you feel sharp pain or pins and needles.`              |
| `target_muscles_en` | text | yes            | Plain names. `Upper trapezius`. Avoid Latin-only terms.                   |

Each has an `_ar` twin: `start_position_ar`, `movement_ar`, `direction_ar`, `return_ar`, `safety_ar`, `target_muscles_ar`. All empty until the Arabic phase.

### Dosage

At least one of `hold_seconds` or `reps` must be present, or the row fails validation. An exercise with no dosage is not an instruction, it's a suggestion.

| Column         | Type    | Required    | Notes                                 |
| -------------- | ------- | ----------- | ------------------------------------- |
| `hold_seconds` | integer | conditional | `30`. Blank if not a hold.            |
| `reps`         | integer | conditional | `10`                                  |
| `sets`         | integer | no          | `3`. Blank means one set.             |
| `rest_seconds` | integer | no          | Between sets                          |
| `each_side`    | boolean | no          | `TRUE` renders "each side"            |
| `frequency_en` | text    | no          | `Twice a day`. Free text, kept short. |

The card renders dosage from these fields, so it reads the same everywhere. Do not write dosage into the instruction text.

### Image

| Column         | Type | Required | Notes                                                                 |
| -------------- | ---- | -------- | --------------------------------------------------------------------- |
| `image_id`     | slug | yes      | Matches a file in `src/assets/images/`. Convention: same as `id`.     |
| `image_alt_en` | text | yes      | Describes the position for someone who cannot see it. Not decorative. |
| `image_alt_ar` | text | no       | Arabic phase                                                          |
| `image_status` | enum | no       | `pending` \| `generated` \| `approved`. Production tracking only.     |

Optional motion fields:

| Column             | Type | Required    | Notes                                                                                    |
| ------------------ | ---- | ----------- | ---------------------------------------------------------------------------------------- |
| `motion_id`        | slug | no          | Stable ID for a short movement demonstration.                                            |
| `motion_status`    | enum | no          | `draft` \| `visual_review` \| `clinical_review` \| `approved` \| `rejected` \| `retired` |
| `motion_poster_id` | slug | conditional | Required when `motion_id` is present.                                                    |
| `motion_alt_en`    | text | conditional | Describes movement and orientation without playback.                                     |

Motion is never required for publication. If present on a patient route it must be approved, muted,
explicitly started, pausable, and consistent with reviewed instructions. Draft or rejected motion
never renders outside preview.

An item with `status: published` and no approved image renders a labelled placeholder rather than breaking. `npm run check:images` lists them.

### Internal

| Column           | Type | Required | Notes                                                    |
| ---------------- | ---- | -------- | -------------------------------------------------------- |
| `notes_internal` | text | no       | Never rendered. Use for source, rationale, review notes. |
| `reviewed_by`    | text | no       | Who clinically approved this row                         |
| `reviewed_date`  | date | no       | ISO: `2026-08-23`                                        |

---

## Validation rules enforced by the build

The build **fails** if:

1. Any required field is empty on a `published` row
2. `area_id` + `section` doesn't exist in the `areas` tab
3. `id` is duplicated
4. `type` is not in the allowed list
5. Neither `hold_seconds` nor `reps` is set
6. `image_alt_en` is empty
7. A numeric column contains non-numeric text
8. An area has more than 8 published items _(soft cap — she asked for 4–5; more than 8 means it's become a dump rather than a protocol)_

The build **warns** but continues if:

- A published item's image file is missing
- An image file exists that no item references
- An area has zero published items (its page is skipped)
- An instruction field exceeds ~200 characters (probably too long for a patient)

---

## Worked example

```
id                  ex-neck-02
section             exercise
area_id             neck
order               2
status              published
name_en             Chin Tuck
type                activation
start_position_en   Sit upright with your feet flat on the floor and your shoulders relaxed.
movement_en         Gently draw your chin straight back, as if making a double chin. Keep your eyes level.
return_en           Release slowly and return your head to a comfortable position.
direction_en
safety_en           Stop if you feel dizzy or get pain down your arm.
target_muscles_en   Deep neck flexors
hold_seconds        5
reps                10
sets                1
each_side           FALSE
frequency_en        Twice a day
image_id            ex-neck-02
image_alt_en        A person sitting upright on a chair, drawing the chin straight back with the head level.
image_status        pending
reviewed_by
reviewed_date
```
