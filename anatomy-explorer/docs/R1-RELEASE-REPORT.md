# R1 Integration & Release Evidence Report

**Release Target:** Anatomy Explorer v1.0 (Unified Handbook & Exploration Engine)  
**Verification Date:** 2026-08-27  
**Build Target:** `c:\Users\HP\Desktop\antigravity\pshyapp\anatomy-explorer\`  
**Reference Folder:** `c:\Users\HP\Desktop\antigravity\pshyapp\patient-library\` (Preserved & Untouched)

---

## 1. Release Readiness Scorecard

| Milestone / Gate          | Criteria                                                                       | Verification Method                                                  | Status                                                                     |
| ------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **S0 Stabilization**      | Image, anatomy, compliance, asset, and rendered-route gates.                   | Latest exact command output.                                         | **IMPLEMENTED; TYPECHECK COMMAND-VERIFIED; OTHER GATES BLOCKED**           |
| **S1 Clinical Safety**    | Draft isolation, publication guards, and clinician-review workflow.            | Source review and human metadata.                                    | **SOURCE-REVIEWED; HUMAN APPROVAL BLOCKED**                                |
| **H1 Handbook & Sharing** | Clinic mode, search, QR codes, deep-link focus, print styles.                  | Source review plus browser/keyboard packet.                          | **IMPLEMENTED / SOURCE-REVIEWED; VISUAL EVIDENCE INCOMPLETE**              |
| **V1 2D Locator**         | Responsive semantic fallback and accessible body-area routing.                 | Source review plus desktop/mobile/accessibility evidence.            | **IMPLEMENTED / SOURCE-REVIEWED; VISUAL EVIDENCE INCOMPLETE**              |
| **V2 Three.js Slice**     | Draft neck slice, asset registry, capability detection, and semantic fallback. | Source review, commands, rendered canvas evidence, clinician review. | **IMPLEMENTED / SOURCE-REVIEWED; NOT VISUALLY VERIFIED OR HUMAN-APPROVED** |
| **Q1 Independent Review** | Findings-first review.                                                         | [`docs/Q1-INDEPENDENT-REVIEW.md`](./Q1-INDEPENDENT-REVIEW.md).       | **REPORT PRESENT; RELEASE FINDINGS REMAIN OPEN**                           |

Q1's active report still contains unsupported acceptance language and a claim that non-WebGL/
JS-disabled behavior was tested and verified. No matching current command or browser evidence packet
was found. Treat that report as a source-review artifact, not acceptance evidence, until Q1's owner
corrects it and supplies reproducible evidence.

---

## 2. Cross-Module Integration Evidence

### A. Routing & Singular Path Enforcement

- **Singular Rule (Decision A-015)**: All exercise URLs uniformly follow `/exercise/[area_id]/` (with anchors `#item-id`). Plural `/exercises/` is completely eradicated.
- **Direct Link Resolution**:
  - `/` → Home page with 3 clear entrances and guide.
  - `/find-my-area/` → Body locator with progressive safety gate and front/back view.
  - `/clinic/` → Unlisted tablet handoff dashboard for physiotherapists.
  - `/stretching/` & `/exercise/` → Populated, published body area directories.
  - `/area/[area_id]/` → Body area landing page connecting stretching and exercise programs.
  - `/legal/[slug]/` → Regulatory disclosures (disclaimer, privacy, credits).
  - `/preview/[section]/[area_id]/` → Isolated clinician draft preview with clear banner.

### B. Safety & Regulatory Parity

- The shared DHA/MOHAP compliance implementation is present and source-reviewed. Its latest command
  did not execute project code because the Node 24.13.0 `tsx` launcher failed.
- Draft safety wording is shielded from patient view until clinician approval.
- Zero analytics, accounts, or third-party tracking scripts.
- 17px base typography and head-to-toe body area sorting maintained.

### C. Offline & Print Capabilities

- Client-side static architecture enables full functionality without server roundtrips.
- Print stylesheets format patient handouts with clean margins, high-contrast dosage grids, and prominent warning callouts.

---

## 3. Verified command outcomes

- `npm ci`: completed successfully; 396 packages installed.
- `npm run typecheck`: completed successfully; 41 files, 0 errors.
- `npm run build`: failed in `prebuild` at `check:compliance`.
- Compliance, anatomy, image, asset, and route commands: not passed; `tsx` failed before project execution with `uv_os_get_passwd ENOMEM`.
- V2 screenshots: not evidence; the connection-refused images were removed.

## 4. Human Launch Gates Checklist

Before flipping the production DNS switch, the clinic team must provide:

- [ ] **Google Sheet Review Metadata**: Fill `reviewed_by` and `reviewed_date` for published exercises.
- [ ] **Clinic Licence Numbers**: Populate DHA facility license and physiotherapist license in `src/config/clinic.ts`.
- [ ] **Production Domain**: Set canonical production domain in deployment configuration.
- [ ] **Safety/Regulatory Approval**: Approve draft safety wording, disclaimer posture, and regulatory classification.
- [ ] **Visual Approval**: Approve 2D/3D region boundaries, front/back orientation, and publication status.
- [ ] **Rendered Evidence**: Review successful 360px and desktop captures plus keyboard/non-WebGL completion.

---

## 5. Final Go/No-Go Recommendation

**Verdict:** **NO-GO**  
Implementation and source review are substantial, but the automated gate suite has not completed,
browser/visual/accessibility evidence is incomplete, and clinical, regulatory, and visual approvals
remain open. Staging or launch readiness must not be claimed yet.
