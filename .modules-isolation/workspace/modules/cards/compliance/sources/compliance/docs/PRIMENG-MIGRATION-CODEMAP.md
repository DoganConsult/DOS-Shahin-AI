# PrimeNG → `@dos/ui-system` Migration Codemap

> Canonical translation table for migrating compliance UI off PrimeNG (forbidden by spec §6, §11, §23, §26 — non-canonical design system) to `@dos/ui-system` (Carbon-based).

Generated 2026-05-02. After Wave 1 i18n + 7 widget scaffolds. **441 PrimeNG imports across 74 page/widget files** to migrate.

---

## Module-by-module map

| PrimeNG module | Used by # imports | Target in `@dos/ui-system` | Notes |
|---|---|---|---|
| `primeng/button` | 56 | `DosCarbonButtonComponent` (`<dos-carbon-button>`) | Inputs: `kind`, `size`, `disabled`, `type`, `(click)`. PrimeNG `[label]` becomes content projection. `icon="pi pi-..."` drops; use Carbon icon component or remove. |
| `primeng/tag` | 49 | `DosCarbonTagComponent` (`<dos-carbon-tag>`) | `[severity]` → `[type]` with Carbon palette. |
| `primeng/table` | 38 | `DosCarbonDataTableComponent` (`<dos-carbon-data-table>`) — or use spec §26.3 SmartDataGrid wrapper from compliance widgets folder | Bigger refactor; columns become `[columns]` input array. |
| `primeng/tooltip` | 32 | Native HTML `title="..."` attribute | Carbon doesn't have a tooltip primitive. Lossy but acceptable. |
| `primeng/api` | 31 | Replace `MessageService` with `@dos/ui-system` `DosStatusBannerComponent` or app-level toast service | `ConfirmationService` → `DosDecisionPreviewPanelComponent` (§26.7). |
| `primeng/dialog` | 30 | `DosCarbonModalComponent` (`<dos-carbon-modal>`) | `[(visible)]` → `[isOpen]` + `(close)`. |
| `primeng/dropdown` | 29 | `DosCarbonSelectComponent` (`<dos-carbon-select>`) | `[options]` similar; `optionLabel`/`optionValue` map. |
| `primeng/inputtext` | 28 | `DosCarbonTextInputComponent` (`<dos-carbon-text-input>`) | `pInputText` → standard `<input>` with `dos-carbon-text-input` wrapper or directive. |
| `primeng/toast` | 27 | `DosStatusBannerComponent` for inline; module-level toast service for transient | Consolidate into a single notification surface. |
| `primeng/progressbar` | 20 | Native `<progress>` or simple `<div>` with `width` style | No direct Carbon primitive; use ds tokens for color. |
| `primeng/card` | 18 | `DosCarbonTileComponent` (`<dos-carbon-tile>`) | Header/footer become slots. |
| `primeng/inputtextarea` | 17 | Native `<textarea>` with optional `dos-carbon-text-input` wrapping | Carbon has no textarea primitive yet — keep native. |
| `primeng/toolbar` | 16 | Replace with custom flex `<div>` using `dos-space-*` tokens | Or use `DosCarbonGridComponent`. |
| `primeng/skeleton` | 16 | `DosSkeletonComponent` (`<dos-skeleton>`) | Direct replacement. |
| `primeng/tabview` | 10 | `DosTabsComponent` (`<dos-tabs>`) or `DosCarbonTabsComponent` | Tab API: `[tabs]` array + `(activeChange)`. |
| `primeng/menu` | 4 | `DosAccountMenuComponent` (kind: 'menu') or build `<dos-side-drawer>` | Lossy — Carbon nav primitives are different. |
| `primeng/radiobutton` | 3 | Native `<input type="radio">` with Carbon styling | No direct primitive; use ds tokens. |
| `primeng/inputnumber` | 3 | Native `<input type="number">` with `dos-carbon-text-input` wrapper | No direct primitive. |
| `primeng/confirmdialog` | 3 | `DosDecisionPreviewPanelComponent` (§26.7) | Dialogue replaced with full §15.2 decision preview. |
| `primeng/badge` | 3 | `DosCarbonTagComponent` with `kind="badge"` | Reuse tag primitive. |

---

## Codemod transforms

```ts
// Stage 1 — imports
"from 'primeng/button'"        → "from '@dos/ui-system'"
"from 'primeng/tag'"           → "from '@dos/ui-system'"
"from 'primeng/table'"         → "from '@dos/ui-system'"
"from 'primeng/dropdown'"      → "from '@dos/ui-system'"
"from 'primeng/inputtext'"     → "from '@dos/ui-system'"
"from 'primeng/skeleton'"      → "from '@dos/ui-system'"
"from 'primeng/tabview'"       → "from '@dos/ui-system'"
"from 'primeng/dialog'"        → "from '@dos/ui-system'"
"from 'primeng/card'"          → "from '@dos/ui-system'"
"ButtonModule"                 → "DosCarbonButtonComponent"
"TagModule"                    → "DosCarbonTagComponent"
"TableModule"                  → "DosCarbonDataTableComponent"
"DropdownModule"               → "DosCarbonSelectComponent"
"InputTextModule"              → "DosCarbonTextInputComponent"
"SkeletonModule"               → "DosSkeletonComponent"
"TabViewModule"                → "DosTabsComponent"
"DialogModule"                 → "DosCarbonModalComponent"
"CardModule"                   → "DosCarbonTileComponent"

// Stage 2 — selectors in templates
"<p-button"                    → "<dos-carbon-button"
"</p-button>"                  → "</dos-carbon-button>"
"<p-tag"                       → "<dos-carbon-tag"
"</p-tag>"                     → "</dos-carbon-tag>"
"<p-table"                     → "<dos-carbon-data-table"
"</p-table>"                   → "</dos-carbon-data-table>"
"<p-dropdown"                  → "<dos-carbon-select"
"</p-dropdown>"                → "</dos-carbon-select>"
"pInputText"                   → "dosCarbonTextInput"      (directive)
"<p-skeleton"                  → "<dos-skeleton"
"</p-skeleton>"                → "</dos-skeleton>"
"<p-tabView"                   → "<dos-tabs"
"</p-tabView>"                 → "</dos-tabs>"
"<p-dialog"                    → "<dos-carbon-modal"
"</p-dialog>"                  → "</dos-carbon-modal>"
"<p-card"                      → "<dos-carbon-tile"
"</p-card>"                    → "</dos-carbon-tile>"

// Stage 3 — input prop renames
"[severity]="                  → "[type]="                  (on tag)
"styleClass=\"p-button-outlined\"" → "[kind]=\"'tertiary'\""
"styleClass=\"p-button-sm\""    → "[size]=\"'sm'\""
"[(visible)]="                 → "[isOpen]="                (on dialog)
"(onClick)="                   → "(click)="                 (on button)
"(onShow)="                    → "(open)="                  (on modal)
"(onHide)="                    → "(close)="                 (on modal)

// Stage 4 — drop primeicons
'pi pi-([a-z-]+)' regex        → use Carbon icon equivalents from @dos/ui-system/components/icon
                                 OR drop entirely (lossy but acceptable for non-essential icons)

// Stage 5 — drop tooltip
'pTooltip="..."'               → 'title="..."'              (native HTML title attr)
'tooltipPosition="..."'        → drop                       (no positional control without primitive)
```

---

## File-by-file plan (74 files, sized by `npm imports`)

Top targets (size + import density):

| Lines | PrimeNG imports | File |
|---|---|---|
| 218 | 1 | `ui/pages/compliance-savings/compliance-savings.component.ts` |
| 245 | (varies) | `ui/compliance/pages/compliance-hub.component.ts` |
| 368 | 11 | `ui/features/compliance/pages/sox-compliance/sox-compliance.component.ts` |
| 466 | 12 | `ui/features/compliance/pages/regulatory-group/compliance-regulatory/compliance-frameworks-page.component.ts` |
| 552 | ~9 | `ui/features/compliance/pages/regulatory-group/compliance-regulatory/obligation-detail-page.component.ts` |
| 571 | (varies) | `ui/features/compliance/pages/regulatory-group/compliance-regulatory/compliance-obligations-page.component.ts` |

Strategy:
- **Tier 1** — small, low-density (~15 files, ≤3 imports, ≤80 lines): apply Stage 1+2 codemod, manually validate template output.
- **Tier 2** — medium (~30 files, 4-7 imports, 80-300 lines): apply Stage 1-3 codemod, hand-test forms.
- **Tier 3** — heavy (~30 files, 8+ imports, 300+ lines): full per-file rewrite.

Pace: ~10 small files/day = ~1.5 weeks Tier 1, ~5 medium/day = 6 days Tier 2, ~2 heavy/day = 3 weeks Tier 3. **Total ≈ 5 weeks one engineer.**

---

## Sed-runnable batch (Tier 1 — try first on a small file before mass-running)

```bash
# Inside modules/compliance/ui/, dry-run first:
find ui -name '*.component.ts' \
  -not -name '*.spec.ts' \
  -not -path '*/_inbound/*' \
  -not -path '*/_legacy/*' \
  | xargs -I{} sed -i.bak \
      -e "s|from 'primeng/button'|from '@dos/ui-system'|g" \
      -e "s|ButtonModule|DosCarbonButtonComponent|g" \
      -e "s|<p-button|<dos-carbon-button|g" \
      -e "s|</p-button>|</dos-carbon-button>|g" \
      -e "s|from 'primeng/tag'|from '@dos/ui-system'|g" \
      -e "s|TagModule|DosCarbonTagComponent|g" \
      -e "s|<p-tag|<dos-carbon-tag|g" \
      -e "s|</p-tag>|</dos-carbon-tag>|g" \
      -e "s|from 'primeng/skeleton'|from '@dos/ui-system'|g" \
      -e "s|SkeletonModule|DosSkeletonComponent|g" \
      -e "s|<p-skeleton|<dos-skeleton|g" \
      -e "s|</p-skeleton>|</dos-skeleton>|g" \
      {}

# Re-run the module typecheck after every batch:
pnpm --filter @dos/module-compliance typecheck
```

The codemod is intentionally conservative — it does NOT touch `p-table` (38 instances) or `p-dropdown` (29 instances) which need API mapping (column shape, options shape).

---

## Proof-of-migration completed

- ✅ `ui/features/compliance/components/analysis/compliance-empty-state.component.ts` (46 lines, 1 PrimeNG import) — migrated to `DosEmptyStateComponent` from `@dos/ui-system`. Typecheck exit 0.

After this proof: 441 → 440 PrimeNG imports.

---

## Hand-off

Remaining migration work is mechanical for Tier 1 + Tier 2 (~45 files). Tier 3 (heavy pages with `p-table`/`p-dropdown`) requires per-file API-shape conversion. This codemap is sufficient documentation for any engineer or LLM to continue the migration at sprint pace.
