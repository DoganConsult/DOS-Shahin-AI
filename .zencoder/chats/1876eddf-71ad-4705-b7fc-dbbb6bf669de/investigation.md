# SHELL_HARDCODED_RESIDUAL_SWEEP — Investigation

## Bug Summary

The six in-scope shell components under `platform/ui-system/dos-ui-system/src/shell/` require a residual
sweep to ensure zero hardcoded visible labels, zero static aria-label strings, and fail-closed
rendering when runtime inputs are absent. Most components have already been cleaned up; the
remaining violations are concentrated in `workspace-action-queue.component.ts` with secondary
minor issues in `context-panel.component.ts` and `inbox-center.component.ts`.

---

## Root Cause Analysis

### Shared infrastructure — COMPLETE ✓

| Item | Status |
|------|--------|
| `shell-accessible-text.ts` exists and exports `sanitizeAccessibleText` | ✓ |
| All 6 components import `sanitizeAccessibleText` | ✓ |
| `lint-no-hardcoded-shell-labels.mjs` exists | ✓ |
| All 6 components in CI guard `WATCHED` array | ✓ |
| Guard wired into `dos-master-gate.mjs` (line 46) | ✓ |
| Guard currently passes (`exit 0`) | ✓ |

### Why the guard passes despite remaining violations

The `BANNED` regex patterns in `lint-no-hardcoded-shell-labels.mjs` match quoted string literals
and static `aria-label=` attributes. They do NOT match:
- Template text nodes containing a hardcoded English word (`overdue` as interpolation suffix)
- Return values from TypeScript methods that produce hardcoded strings (`'due today'`, `'d overdue'`, `'due in Xd'`)

---

## Affected Components

### 1. `workspace-action-queue.component.ts` — **PRIMARY** (3 violations)

**Violation A — template: hardcoded " overdue" text (line 56)**
```html
<dos-carbon-tag type="red" size="sm" class="dos-action-queue__overdue">
  {{ overdueCount }} overdue      <!-- ← hardcoded English word -->
</dos-carbon-tag>
```

**Violation B — TypeScript: hardcoded English in `daysLabel()` (lines 299–301)**
```typescript
daysLabel(dueAt: string): string {
  const diff = Math.round((new Date(dueAt).getTime() - Date.now()) / 86_400_000);
  if (diff === 0) return 'due today';           // ← hardcoded
  if (diff < 0) return `${Math.abs(diff)}d overdue`;   // ← hardcoded
  return `due in ${diff}d`;                     // ← hardcoded
}
```
`daysLabel()` output is rendered in the template at line 102:
```html
{{ daysLabel(item.dueAt) }}
```

**Violation C — minor: empty-state `<p>` renders even when `emptyText` is `''` (line 126)**
```html
} @else {
  <div class="dos-action-queue__empty">
    <p>{{ emptyText }}</p>   <!-- renders <p></p> when emptyText='' -->
  </div>
}
```
`emptyText` defaults to `''` at line 268. No guard present.

---

### 2. `context-panel.component.ts` — **MINOR** (1 violation)

**Violation D — minor: `<p>` renders even when `aiLoadingText` is `''` (line 71)**
```html
<p class="dos-context-panel__ai-placeholder">
  {{ aiLoadingText }}   <!-- renders empty <p> when aiLoadingText='' -->
</p>
```
`aiLoadingText` defaults to `''` at line 202. No `@if` guard present.

---

### 3. `inbox-center.component.ts` — **MINOR** (1 violation)

**Violation E — minor: `<p>` renders even when `emptyText` is `''` (line 116)**
```html
<div class="dos-inbox-empty">
  <p>{{ emptyText }}</p>   <!-- renders empty <p> when emptyText='' -->
</div>
```
`emptyText` defaults to `''` at line 331. No `@if` guard present.

---

### 4–6. `command-search.component.ts`, `quick-create.component.ts`, `desktop-sidebar.component.ts` — **CLEAN** ✓

All three are fully compliant:
- Fail-closed guards (`hasSearchChrome()`, `fabChrome()`, `sidebarAriaChrome()`) block render when runtime inputs absent.
- All aria-label bindings use `sanitizeAccessibleText` + null-coalescing to `null`.
- No hardcoded English labels, no static `aria-label=` values.

---

## Proposed Solution

### workspace-action-queue.component.ts

**Fix A (overdue count tag):** Add `@Input() overdueLabel = ''` and guard the tag with both
`overdueCount > 0` AND `sanitizeAccessibleText(overdueLabel).length > 0`. Replace the
hardcoded `{{ overdueCount }} overdue` with `{{ overdueCount }} {{ overdueLabel }}`.

```html
@if (overdueCount > 0 && overdueChrome()) {
  <dos-carbon-tag type="red" size="sm" class="dos-action-queue__overdue">
    {{ overdueCount }} {{ sanitizedOverdueLabel() }}
  </dos-carbon-tag>
}
```

**Fix B (daysLabel strings):** Add `@Input() dueDateLabels: { today: string; overduePattern: string; futurePattern: string } | null = null`.
When `dueDateLabels` is `null` or any member is empty, fall back to ISO date display only
(fail-closed — never invent English). The `daysLabel()` method returns an empty string when
`dueDateLabels` is absent, and the template guards `{{ daysLabel(item.dueAt) }}` with
`@if (daysLabel(item.dueAt))`.

Pattern interpolation (replacing `X` with the numeric diff) is handled in the component using
the runtime-supplied pattern strings, not invented English.

**Fix C (emptyText guard):** Wrap the `<div class="dos-action-queue__empty">` in
`@if (emptyTextChrome())` where `emptyTextChrome()` = `sanitizeAccessibleText(emptyText).length > 0`.

---

### context-panel.component.ts

**Fix D (aiLoadingText guard):**
```html
@if (aiLoadingChrome()) {
  <p class="dos-context-panel__ai-placeholder">{{ aiLoadingText }}</p>
}
```
Add `aiLoadingChrome(): boolean { return sanitizeAccessibleText(this.aiLoadingText).length > 0; }`.

---

### inbox-center.component.ts

**Fix E (emptyText guard):**
```html
@if (emptyTextChrome()) {
  <div class="dos-inbox-empty">
    <p>{{ emptyText }}</p>
  </div>
}
```
Add `emptyTextChrome(): boolean { return sanitizeAccessibleText(this.emptyText).length > 0; }`.

---

### CI guard updates (`lint-no-hardcoded-shell-labels.mjs`)

Add to `BANNED` array:
```js
{ name: 'hardcoded overdue template suffix', re: /\}\}\s+overdue\b/g },
{ name: 'hardcoded due-today string',        re: /['"`]due today['"`]/g },
{ name: 'hardcoded d-overdue pattern',       re: /['"`][^'"]*d overdue['"`]/g },
{ name: 'hardcoded due-in pattern',          re: /['"`]due in [^'"]*['"`]/g },
```

---

## Summary Table

| Component | Status | Required Changes |
|-----------|--------|-----------------|
| `command-search.component.ts` | ✅ CLEAN | None |
| `quick-create.component.ts` | ✅ CLEAN | None |
| `desktop-sidebar.component.ts` | ✅ CLEAN | None |
| `context-panel.component.ts` | ⚠️ MINOR | Add `@if (aiLoadingChrome())` guard around `aiLoadingText` paragraph |
| `inbox-center.component.ts` | ⚠️ MINOR | Add `@if (emptyTextChrome())` guard around `emptyText` paragraph |
| `workspace-action-queue.component.ts` | ❌ VIOLATIONS | (A) `overdueLabel` @Input + guard overdue tag; (B) `dueDateLabels` @Input + remove hardcoded `daysLabel()` strings; (C) `emptyTextChrome()` guard |
| `lint-no-hardcoded-shell-labels.mjs` | ⚠️ GAPS | Add 4 banned regex patterns for overdue/daysLabel hardcoded text |

---

## Scope Boundary Reminder

- `shell-host.component.ts` and `surface-renderer.component.ts` — **out of scope**
- No new hardcoded English strings may be introduced as `@Input()` defaults
- If runtime surfaces are missing `overdueLabel` / `dueDateLabels` / `emptyText`: UI-OS resolver
  seeds must supply them; frontend components must render empty/nothing when absent
