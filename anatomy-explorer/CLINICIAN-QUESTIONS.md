# Questions only the physiotherapist can answer

**None of these block the build.** Each has a default we build; each is cheap now and expensive
later. Ordered by what they cost if she disagrees.

---

## ⚠️ First, a gap worth closing

The exercise library carries eight open decisions — **D1 through D8** in
`../patient-library/memory.md` — all marked "blocked on a human" since 2026-08-23. A brief form
was built for her at `../patient-library/prototype/physiotherapist-brief-form.html` and there is
**no record of a completed response anywhere in the repository.**

That includes D2 (illustration style), D3 (clinic branding), D4 (disclaimer wording) and **D8
(whether a regulator reads this as education or advertisement)** — the only one that can stop a
launch. They have been open for three days while content production ran ahead of them.

Anatomy Explorer inherits every one of those, and adds the questions below. If one conversation
happens with her this week, make it this one.

---

## About the body map

| #   | Question                                                                                                                                                                       | Default we build                     | Cost if she disagrees     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------- |
| A1  | Do the region boundaries match how you'd describe them to a patient? Front of shoulder, top of shoulder, back of shoulder, outside of the upper arm — is that the right split? | The zones in `pain-zones.ts`         | Data only                 |
| A2  | The map shows only the 8 areas that have exercises. Should a patient who taps the upper back get "nothing here yet", or should the region not exist at all?                    | Region does not exist                | One condition in M1       |
| A3  | Left and right — should the app say "your right shoulder", or just "shoulder"? Patients mirror themselves when looking at a figure.                                            | Say the side                         | Copy only                 |
| A4  | Should the figure be recognisably gendered, or the neutral stylised form we have?                                                                                              | Neutral stylised                     | Regenerate geometry       |
| A13 | For each region, does choosing an exact zone change any approved education or safety guidance?                                                                                 | Use broad region only unless it does | Removes unnecessary steps |

## About the safety gate

| #   | Question                                                                                                                             | Default we build                           | Cost              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ----------------- |
| A5  | **The emergency number.** The stop screen needs the right one for the clinic's jurisdiction, and your sign-off on the exact wording. | Placeholder constant, flagged in code      | **Blocks launch** |
| A6  | Are the eight triggers the right eight for your patients, in your words?                                                             | `CLINICAL-SAFETY.md` §3 verbatim           | Data only         |
| A7  | Should a red flag stop the patient completely, or offer "contact the clinic" as an action?                                           | Stop, with contact guidance in the message | One button        |

## About the education layer

| #   | Question                                                                                                                                                                                          | Default we build                | Cost                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------- |
| A8  | We show which muscles each exercise works, from your own `target_muscles_en`. Is that useful to a patient, or is it clinician-facing detail?                                                      | Show it                         | Delete one component |
| A9  | Some of your muscle names don't map cleanly to a body region — "external rotators", for instance. Which region should those highlight?                                                            | Left unmapped, nothing rendered | Data only            |
| A10 | Do you want a short paragraph per body area eventually — what's in there, what loads it? If yes it is 8 spreadsheet rows, not a document, and it can wait until the exercise content is finished. | Section hidden until rows exist | None to code         |

## About who it's for

| #   | Question                                                                                                          | Why it matters                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| A11 | **Would you use this yourself in the treatment room** — tablet, tapping a region while explaining what you found? | This may be the version that earns its keep. It needs no education content and takes no patient-facing risk. Changes what we build next. |
| A12 | Do you want patients finding this on their own, or only after you've assessed them and sent the link?             | Decides whether this is a patient-retention tool or an acquisition surface — and acquisition is what makes D8 live.                      |
| A14 | Should the first release be limited to patients who received the link after assessment?                           | Yes, clinician-assisted launch                                                                                                           | Determines positioning and regulatory exposure |

---

## How to ask

Not as a document. Twelve questions in a form is how the last one went unanswered.

Show her the thing working on a phone, in the room, and ask A11 and A5 first. A11 tells you what
to build next. A5 is the only one that can stop a launch.
