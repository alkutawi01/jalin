# JLN-CER-0003 — Visual Review Brief

Status: `JALIN_VISUAL_REQUIRED`
Work: `Rumah yang Masih Menyimpan Suara` (`JLN-CER-0003`)
Session baseline: 7
Manuscript baseline: `v1.8`
Writer/Critic gate: Session 7 committed at `bcf7c2711f72963dfa9c9d1efadc9b4d0eaee415`; PR body persists `JALIN_SESSION_7_DRAFT`; awaiting Independent Critic

This is an internal commissioning/review brief only. It does not approve, publish, or map any visual.

## Gate state

- Session 7 prose is committed as v1.8 at `bcf7c2711f72963dfa9c9d1efadc9b4d0eaee415`, and PR #3 body persists `Status: JALIN_SESSION_7_DRAFT` with the Writer commit and next-owner handoff.
- `JALIN_SESSION_7_CRITIQUE` is not yet persisted on PR #3.
- `JALIN_TEXT_REVIEW_COMPLETE` is not yet persisted on PR #3.
- Therefore Session 8 must not start and no visual candidate may receive `JALIN_VISUAL_PASSED`.
- Writer support may prepare provenance, briefs, candidate specs, and non-prose consistency checks only.

## Canon truth

- Opening exterior is **pagi**.
- The final veranda beat occurs **after Maghrib**, after Farid has phoned the agent and before he leaves.
- In that beat, Aiman descends the **three front steps** with the **old broom**, sweeps only a **small strip** in front of the steps, and Farid is already near the **gate**.
- Human faces should remain unclear/obscured.
- Preserve established house architecture, veranda, yard, gate, restrained painterly Jalin House Style, and symbolic-object continuity.
- No readable text should appear in generated visuals.

## Mapped production assets

| Asset | Role | Model | Size | Canon/review note |
| --- | --- | --- | --- | --- |
| `Xm5ZOkMBfo` | hero | Seedream 5 Pro | 2560×1440 | source prompt says golden hour; does not match current **pagi** opening |
| `WDaOL1OcXe` | inline handwritten-note scene | Seedream 5 Pro | 2304×1728 | no separate defect identified; note must remain unreadable |
| `mEjYiz2hJQ` | inline veranda | Seedream 5 Pro | 2304×1728 | source prompt says evening; must be independently checked against **post-Maghrib** canon |

## Correction candidates

One-item review discipline applies; do not create duplicates without a recorded rejection reason.

1. `1liHRa4r4r` — hero correction candidate #1 — Seedream 5 Pro — 2560×1440 — prompt explicitly requires early morning, no sunset/golden hour.
2. `lJG1FGdgv9` — hero correction candidate #2 — Seedream 5 Pro — 2560×1440 — later early-morning candidate; do not prefer it over candidate #1 without a concrete review reason.
3. `ksis6r616B` — corrected veranda candidate — Seedream 5 Pro — 2304×1728 — prompt targets post-Maghrib / early night, Aiman with the old broom at the three front steps, one small swept strip, Farid secondary near the gate, no readable text, unclear faces, and preserved house/veranda/yard/gate continuity.

All three candidates remain **unapproved**.

## Provenance / review evidence

- Hero candidate `1liHRa4r4r` has one private assist comment (`64310`) recording that it remains the oldest bounded hero candidate and that final approval is withheld pending text-review completion. That note is not approval.
- Corrected veranda candidate `ksis6r616B` is completed and has a ready delivery render, but metadata/delivery readiness is not a pixel-level pass.
- Prior inline-image transport attempts for pixel inspection encountered transient `AioRpcError`; no visual pass may be inferred from prompt/provenance alignment alone.
- No additional competing hero or veranda candidate should be generated unless the oldest viable candidate is independently rejected with a concrete reason.

## Metadata sequencing guard

- Do **not** change the Work hero alt text from `petang` to `pagi` while the mapped hero still points to `Xm5ZOkMBfo`; accessibility metadata must not claim a scene state the mapped image does not show.
- Do **not** change the veranda alt text to `selepas Maghrib` until the mapped veranda visual has independently passed that canon beat.
- Visual mapping and public alt-text correction should move together in a separate reviewed visual step after independent evidence exists.

## Independent Visual Curator gate

Independent Visual Curator must inspect actual rendered pixels and check:

- scene truth,
- time of day,
- architecture/continuity,
- faces and anatomy,
- composition and symbolic-object continuity,
- absence of readable accidental text,
- overall Jalin House Style.

Only an independent reviewer may mark `JALIN_VISUAL_PASSED`.

## Persistence state

- PR #3 already contains `JALIN_VISUAL_SUPPORT_HANDOFF` as issue comment `5840039693`, but its recorded exact head is stale after later bounded support-document commits.
- `JALIN_SESSION_7_DRAFT` is already persisted in PR #3 body with Writer commit `bcf7c2711f72963dfa9c9d1efadc9b4d0eaee415`; do not create a duplicate top-level handoff comment merely to mirror the same marker.
- Exact-head refresh attempts for the existing `JALIN_VISUAL_SUPPORT_HANDOFF` have repeatedly been blocked by connector safety checks; treat only that visual-support refresh as `PENDING_HANDOFF` until a current-head PR write succeeds.
- On the next run, retry the existing handoff first rather than creating a duplicate comment.
- If the branch head changes, revalidate only the changed files before retrying persistence; do not redo completed Writer or visual-support work.
- The repeated transport/recovery checkpoints previously accumulated in this file were consolidated here for non-prose support hygiene; the authoritative current state is the compact record above.

No cerpen prose, session numbering, Work visual mapping, public alt text, merge, publish, deploy, production, or tooling state is authorized by this brief.

Production touched = NO.
