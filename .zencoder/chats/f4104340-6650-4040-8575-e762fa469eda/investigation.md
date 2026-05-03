# Investigation — Archetype Enhancement Matrix Drift

## Bug summary

`platform/core/platform/shell/templates/module-template.types.ts` declares the
canonical archetype roster as **32** entries (`ARCHETYPE_COUNT = 32`,
`ARCHETYPE_REGISTRY.length === 32`, `PageArchetype` union has 32 members
including `case-finalization`), but three doc-comments and the
`ARCHETYPE_ENHANCEMENT_MATRIX` constant are still pinned to the prior
**31**-archetype state. The matrix is missing the `case-finalization`
profile entirely, so `assertEnhancementMatrixCoverage()` will throw at
module load (`expected 32 profiles, found 31` and
`missing profiles: case-finalization`).

## Root cause analysis

When the 32nd archetype `case-finalization` was added (Phase WS-1, migration
`20260504_0020_phase_ws_case_finalization_archetype.sql`), the type union,
registry, and `ARCHETYPE_COUNT` were updated, but the cross-cutting
G14 enhancement matrix and three docstring counts were not bumped. The
existing coverage guard catches the missing row but no one re-ran the file
after the registry bump, so the runtime throw is shipped.

## Affected components

- File: [./platform/core/platform/shell/templates/module-template.types.ts](./platform/core/platform/shell/templates/module-template.types.ts)
  - Line 2: docstring still says `13 page templates` → must say `32 canonical page archetypes`.
  - Line 140: section header still says `Canonical 31 Page Archetype Names` → must say `Canonical 32`.
  - Line 311: G12 comment still says `consumed by the 31 archetypes` → must say `32 archetypes`.
  - Lines 453–485: `ARCHETYPE_ENHANCEMENT_MATRIX` has 31 entries; missing `case-finalization`.
  - Lines 488–503: `assertEnhancementMatrixCoverage()` does not detect duplicates (optional hardening).

No other files reference `ARCHETYPE_ENHANCEMENT_MATRIX` (verified by grep).
DB carbon_key catalog cross-checked: all 6 carbonKey values used by the
registry (`grid`, `tiles`, `table`, `tabs`, `structured-list`,
`progress-indicator`) exist in `dos.ui_carbon_components` — no runtime gate
risk from the existing rows.

## Proposed solution

Apply exactly the 4 fixes described in the user-supplied review, plus the
optional duplicate-detection hardening in `assertEnhancementMatrixCoverage`:

1. **Fix 1** — top-of-file docstring `13 page templates` → `32 canonical page archetypes`.
2. **Fix 2** — section header `Canonical 31 Page Archetype Names` → `Canonical 32 Page Archetype Names`.
3. **Fix 3** — G12 comment `31 archetypes` → `32 archetypes`.
4. **Fix 4** — append the missing matrix row before `] as const;`:
   ```ts
   { archetype: 'case-finalization',     molecules: ['dos-side-panel','dos-narrative-panel','dos-agent-followup','dos-impact-preview-modal'] },
   ```
5. **Optional hardening** — replace `assertEnhancementMatrixCoverage()` with
   the duplicate-detecting variant from the review (catches accidental
   double-rows in addition to missing/count drift).

## Edge cases / side effects

- The file invokes both `assertArchetypeRegistryIntegrity()` and
  `assertEnhancementMatrixCoverage()` at module load. Today the second
  guard throws at import-time → any consumer of this module currently
  fails to load. The fix restores green import.
- No FE/BE consumer references the matrix shape today (grep clean), so
  adding the missing row is purely additive.
- `case-finalization` molecule list mirrors `incident-response` minus
  `dos-readiness-meter` — appropriate for case-closure narrative + agent
  follow-up + impact-preview pattern.
- Carbon catalog verified: no `carbonKey` in the registry collides with
  the `tile`/`data-table` naming risk flagged in the review.

## Verification plan (Step 2)

- Add/update a regression test asserting
  `ARCHETYPE_ENHANCEMENT_MATRIX.length === ARCHETYPE_COUNT` and that every
  `ARCHETYPE_REGISTRY` archetype is profiled (test should fail before the
  fix, pass after).
- Run `pnpm --filter` typecheck on the owning workspace package once the
  exact target is identified during implementation.

---

## Implementation notes (Step 2 — completed)

**Files changed**

- [./platform/core/platform/shell/templates/module-template.types.ts](./platform/core/platform/shell/templates/module-template.types.ts)
  - Line 3: docstring `13 page templates` → `32 canonical page archetypes`.
  - Line 140: section header `Canonical 31` → `Canonical 32`.
  - Line 311: G12 comment `31 archetypes` → `32 archetypes`.
  - Line 485: appended matrix row
    `{ archetype: 'case-finalization', molecules: ['dos-side-panel','dos-narrative-panel','dos-agent-followup','dos-impact-preview-modal'] },`.
  - Lines 488–528: replaced `assertEnhancementMatrixCoverage()` with the
    duplicate-detecting variant (detects duplicates → missing → length drift).

**Regression test**

- Skipped per scope guard. The owning test location does not exist:
  `templates/` has no co-located vitest test, and the root vitest config
  (`platform/config-center/test/root/vitest.config.mts`) does not include
  `platform/core/platform/shell/**` in its `include` globs. Existing
  sibling files (`shell-components.test.ts`, `page-context-labels.test.ts`)
  are not picked up by any active runner. No new test file added.

**Validation results**

- Module-load guards (executed via `npx tsx` import of the patched file):
  - `assertArchetypeRegistryIntegrity()` — PASS (no throw).
  - `assertEnhancementMatrixCoverage()` — PASS (no throw).
  - `ARCHETYPE_COUNT` = 32, `ARCHETYPE_REGISTRY.length` = 32,
    `ARCHETYPE_ENHANCEMENT_MATRIX.length` = 32.
  - `case-finalization` present in both registry and matrix.
  - `missingFromMatrix` = [], `extraInMatrix` = [], `duplicates` = [].
- Typecheck (`tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck`)
  on the patched file — 0 errors.

**Verdict**: COMPLETE.
