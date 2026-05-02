# Wave G — UI Guard Baseline Audit and Ratchet Plan

**Date:** 2026-04-30
**Roadmap reference:** [`platform/docs/ui/ui-component-migration-roadmap.md`](ui-component-migration-roadmap.md) §7 (Raw CSS reduction plan)
**Status:** **AUDITED — multi-quarter program filed**, with one in-session zero-out candidate.

---

## Context

The five UI guards (`ui-no-raw-css`, `ui-rtl-logical-css`,
`ui-component-allowlist`, `ui-responsive-contract`, `ui-no-overlapping-fabs`)
already enforce zero-new-violations under the `BASELINE_RATCHET` mechanism.
The roadmap originally framed Wave G as "flip BASELINE_RATCHET → RATCHET" —
but that wording was misleading. The mechanism IS the ratchet (no new
violations admitted). The *real* Wave G goal is shrinking each baseline to
zero so the ratchet has nothing to grandfather.

This commit establishes the audit baseline and a realistic plan.

## Current baseline contents

```
scripts/ci-guards/baselines/ui-no-raw-css.json         : 1112 entries
scripts/ci-guards/baselines/ui-rtl-logical-css.json    :   55 entries
scripts/ci-guards/baselines/ui-no-overlapping-fabs.json:    2 entries
scripts/ci-guards/baselines/ui-responsive-contract.json:    0 entries
```

Total: **1169 grandfathered violations** across the four ratchet-driven
guards. Total guard suite remains 5/5 PASS today because no new
violations are admitted.

## Ownership and effort tier

| Guard | Entries | Surface | Realistic effort | Owner |
|---|---:|---|---|---|
| `ui-no-raw-css` | 1112 | broad — products/shahin-ai/app (~717), modules/compliance (~90), platform/foundation (~41), modules/foundation (~35, will shrink as Wave E quarantine continues), modules/workflow (~32), platform/{dauth,dnoc,dos,dsoc} (~4) | **multi-quarter**, per-module via tokenisation passes | Each module owner |
| `ui-rtl-logical-css` | 55 | concentrated in ai-governance, governance, hr, dora, fitch features | **2-3 commits**, single-developer batch | UI OS team |
| `ui-no-overlapping-fabs` | 2 | platform/shell + features/mobile/components | **1 commit**, in-session candidate | UI OS team |
| `ui-responsive-contract` | 0 | n/a | already zero | UI OS team |

## Plan

### Tier 1 — In-session candidates (this wave)

**`ui-no-overlapping-fabs`** has only 2 baseline entries. Audit each:

```
products/shahin-ai/app/src/app/blueprint/core/platform/shell : 2 hits
products/shahin-ai/app/src/app/blueprint/features/mobile/components : 2 hits
```

The shell hit is presumably from a place that defines a FAB-positioned
element alongside the AI-assistant FAB (which is the only platform-level
FAB allowed under `Roadmap §8 / §6.4`). The mobile-components hit is
likely from a feature surface that retained an overlay button.

Action: review the 4 sites; if any are dead code (e.g. unused FAB classes
left from earlier refactor), remove them; if any are legitimate, propose
re-categorising as non-FAB chrome (e.g. an inline button that happens to
have `position: fixed`). Goal: drive the baseline to **0** in a single
follow-up commit. **Filed as Wave G-1.**

### Tier 2 — Single-developer batch (1-2 weeks, dedicated effort)

**`ui-rtl-logical-css`** has 55 entries — every one a `padding-left`,
`margin-right`, or similar physical property that should be a logical
property (`padding-inline-start`, `margin-inline-end`, etc.).

Each fix is mechanical:
- `padding-left`  → `padding-inline-start`
- `padding-right` → `padding-inline-end`
- `margin-left`   → `margin-inline-start`
- `margin-right`  → `margin-inline-end`
- `left:`         → `inset-inline-start:`
- `right:`        → `inset-inline-end:`
- `text-align: left|right` → `text-align: start|end`

Approach: a single PR walks the 55 files, applies the substitutions,
verifies visual snapshots in LTR + RTL on a running Shahin frontend.
Filed as **Wave G-2** (separate effort).

### Tier 3 — Multi-quarter program

**`ui-no-raw-css`** has 1112 entries spread across the entire estate.
Single-developer attempts will burn out before completion — and the
work touches every module owner, so a single team can't rationally
commit.

Realistic structure:

| Phase | Scope | Deliverable | Owner |
|---|---|---|---|
| G-3a | products/shahin-ai/app active workspace pages (~80 entries, the user-visible critical path) | tokenise via `@dos/design-tokens`; replace local cards with UI-OS primitives | UI OS team + workspace-home owner |
| G-3b | platform/foundation (~41 entries) | Foundation vertical absorbs as part of its hardening sprint | Foundation owner |
| G-3c | modules/foundation (~35 entries, **will drop as Wave E quarantine continues**) | Wave E quarantine batches naturally remove these from baseline; no separate effort needed | n/a (handled by Wave E) |
| G-3d | modules/compliance (~90), modules/workflow (~32) | Wait for vertical wave activation; tokenisation happens during vertical's own UI-OS adoption pass | Vertical owners |
| G-3e | products/shahin-ai/website (~537 entries — the largest single tree) | Website-side dedicated UI-OS adoption wave; ratchet-shrink as part of that | Website owner |
| G-3f | the remaining ~30 entries scattered across platform/{dauth,dnoc,dos,dsoc} | Platform-only cleanup; lowest priority | Platform team |

Total realistic timeline: **2-4 quarters** with module owners delivering
phases as part of their own UI-OS adoption work. Don't try to single-
shot it.

## Reversibility

- Audit doc only; no code changes in this commit.
- Each Tier above is its own follow-up wave with its own revertable
  commits.
- The ratchet mechanism remains green throughout; baseline only shrinks
  (never grows) per the existing guard utility's contract.

## Cross-references

- Guard utility: `scripts/ci-guards/_ui-guard-utils.mjs` (line 76:
  `reportAndExit(guardName, offenders, mode)` — the mode label is
  informational; the mechanism enforces zero-new-violations).
- Baselines: `scripts/ci-guards/baselines/*.json`.
- Roadmap §7 (Raw CSS reduction plan): [`ui-component-migration-roadmap.md`](ui-component-migration-roadmap.md).

## Open Wave G follow-ups (filed)

- **G-1**: drive `ui-no-overlapping-fabs` baseline to 0 (4 sites).
- **G-2**: drive `ui-rtl-logical-css` baseline to 0 (55 files, mechanical).
- **G-3a..f**: phase-by-phase `ui-no-raw-css` shrink — module owners.

## Sign-off

| Role | Name | Date |
|---|---|---|
| Author | Claude (Opus 4.7) on behalf of DOS Platform | 2026-04-30 |
| Reviewer | _pending — needed before G-1 / G-2 / G-3 sequencing_ | _pending_ |
