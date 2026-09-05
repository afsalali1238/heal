# Release checklist — supervisor gate

| Gate                                  | Owner          | Status                     | Evidence / blocker                                                                                                                                                                                                          |
| ------------------------------------- | -------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0 executable checks and dependencies | S0             | Changes required           | `npm ci` succeeded and `npm run typecheck` passed (41 files, 0 errors). `npm run build` fails in `prebuild`; all `tsx` gates crash under Node 24.13.0 with `uv_os_get_passwd ENOMEM`. Node 22 verification was unavailable. |
| Published clinician review metadata   | S1 / clinician | Blocked                    | Five published items remain without genuine `reviewed_by` and `reviewed_date`; no agent may fill them                                                                                                                       |
| Draft safety wording approval         | S1 / clinician | Blocked                    | Draft safety content remains a human review gate                                                                                                                                                                            |
| H1 clinic/search/QR/print             | H1             | Changes required           | Implementation exists; complete 360px + desktop screenshots, keyboard evidence, and command packet absent                                                                                                                   |
| V1 2D locator and semantic fallback   | V1             | Changes required           | Semantic route exists; browser screenshots, keyboard, reduced-motion, zoom, and non-WebGL evidence absent                                                                                                                   |
| V2 Three.js one-region slice          | V2             | Changes required / blocked | Slice exists, but arrived before authorization. It has no accepted rendered screenshots, canvas checks, performance evidence, or H5 clinical visual review; it cannot be integrated yet.                                    |
| Route crawl and rendered links        | S0 / R1        | Changes required           | Crawler now reads `dist/`, but no successful post-build crawl evidence exists                                                                                                                                               |
| Asset registry and media              | V2             | Blocked                    | Assets are draft; fallback approval and actual media evidence are absent                                                                                                                                                    |
| Regulatory/compliance gate            | S0/S1          | Blocked                    | Cannot claim launch readiness while clinical metadata and safety approval remain open                                                                                                                                       |
| Git scope                             | Supervisor     | Verified                   | `git status --short` shows the pre-existing untracked split and no `patient-library/` edits                                                                                                                                 |

## Evidence rule

Archived handoff documents are not acceptance evidence. Only current, reproducible command output and attached 360px/desktop browser captures can move H1 or V1 out of “Changes required.”

## Browser / visual / accessibility evidence

No acceptable browser evidence packet is present. Required before acceptance:

- H1 and V1 screenshots at 360px and desktop widths.
- Keyboard-only completion, focus behavior, zoom/text-size behavior, reduced motion, and non-WebGL semantic completion.
- V2 screenshots only after the one-region slice is implemented, with loading/error/fallback states.

## Decision

**No-go.** S0 is not accepted, clinical review gates are open, H1/V1 evidence is incomplete, and V2 is not authorized.
