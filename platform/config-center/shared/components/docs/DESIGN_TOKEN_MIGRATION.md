# Design Token Migration Log

**Version:** 1.0.0  
**Effective Date:** 2026-03-20  
**Status:** FROZEN — Migration Policy

---

## Overview

This document tracks the migration of hardcoded visual values to design tokens across canonical shared UI components. This ensures consistent theming, easier maintenance, and alignment with IBM Carbon Design System v11.

---

## Migration Policy

### Non-Negotiable Rules

1. **No hardcoded hex colors** — Use Carbon color tokens or semantic tokens (`--primary`, `--text-heading`, etc.)
2. **No hardcoded spacing values** — Use spacing tokens (`--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`, `--space-2xl`)
3. **No hardcoded font sizes** — Use typography tokens (`--font-size-xs` through `--font-size-4xl`)
4. **No hardcoded rgba colors** — Use `color-mix()` with design tokens for opacity effects, or predefined glass effect tokens

### Token Sources

- **Design Tokens:** `frontend/src/styles/design-tokens.css`
- **GRC Tokens:** `frontend/src/styles/grc-tokens.css`
- **Carbon Colors:** `--carbon-{color}-{shade}` (e.g., `--carbon-blue-60`)
- **Semantic Tokens:** `--primary`, `--text-heading`, `--text-muted`, `--text-body`, `--surface`, `--border-subtle`, etc.

---

## Migrated Components (Phase D1)

### 1. Stat Card (`stat-card.component.ts`)

**Migrated:**
- `#0f62fe` → `var(--primary)`
- `rgba(14, 165, 233, 0.08)` → `color-mix(in srgb, var(--primary) 8%, transparent)`
- `rgba(14, 165, 233, 0.15)` → `color-mix(in srgb, var(--primary) 15%, transparent)`
- `rgba(255, 255, 255, 0.3)` → `color-mix(in srgb, var(--surface) 30%, transparent)`
- `4px` → `var(--space-xs)`

**Status:** ✅ Complete

---

### 2. Page Header (`page-header.component.ts`)

**Migrated:**
- `#fff` → `var(--surface)`
- `#374151` → `var(--text-body)`
- `#9ca3af` → `var(--text-muted)`
- `#eff6ff` → `var(--carbon-blue-10, var(--primary-50))`
- `#dbeafe` → `var(--carbon-blue-20, var(--primary-100))`
- `#2563eb` → `var(--primary)`
- `#1d4ed8` → `var(--carbon-blue-70, var(--primary-700))`
- `#bfdbfe` → `var(--carbon-blue-30, var(--primary-200))`
- `#defbe6` → `var(--status-success-bg, var(--carbon-green-10))`
- `#bbf7d0` → `var(--carbon-green-20)`
- `#15803d` → `var(--carbon-green-70)`
- All pixel spacing values → spacing tokens (`--space-xs`, `--space-sm`, `--space-md`, `--space-lg`, `--space-xl`)
- `0.75rem` → `var(--font-size-xs)`

**Status:** ✅ Complete

---

### 3. Section Header (`section-header/section-header.component.ts`)

**Migrated:**
- `rgba(14, 165, 233, 0.08)` → `color-mix(in srgb, var(--primary) 8%, transparent)`
- `rgba(14, 165, 233, 0.18)` → `color-mix(in srgb, var(--primary) 18%, transparent)`
- `rgba(14, 165, 233, 0.10)` → `color-mix(in srgb, var(--primary) 10%, transparent)`
- `rgba(14, 165, 233, 0.14)` → `color-mix(in srgb, var(--primary) 14%, transparent)`
- `rgba(14, 165, 233, 0.28)` → `color-mix(in srgb, var(--primary) 28%, transparent)`
- `rgba(14, 165, 233, 0.12)` → `color-mix(in srgb, var(--primary) 12%, transparent)`
- `#0c4a6e` → `var(--text-heading)`
- `#5e6e80` → `var(--text-muted)`
- `36px` → `var(--font-size-3xl)`
- `17px` → `var(--font-size-md)`
- All pixel spacing values → spacing tokens

**Status:** ✅ Complete

---

### 4. Empty State (`empty-state.component.ts`)

**Migrated:**
- `#9ca3af` → `var(--text-muted)`
- `#2563eb` → `var(--primary)`
- `#1d4ed8` → `var(--carbon-blue-70, var(--primary-700))`
- `#fff` → `var(--surface)`
- All pixel spacing values → spacing tokens

**Status:** ✅ Complete

---

### 5. Skeleton Loader (`skeleton-loader.component.ts`)

**Migrated:**
- `#f0f0f0` → `var(--carbon-gray-10)`
- `#e0e0e0` → `var(--carbon-gray-20)`
- All pixel spacing values → spacing tokens

**Status:** ✅ Complete

---

### 6. Page Shell (`page-shell.component.ts`)

**Migrated:**
- `#fff` → `var(--surface)`
- `#6b7280` → `var(--text-muted)`
- `#374151` → `var(--text-body)`
- `20px` → `var(--space-lg)`
- `12px` → `var(--space-md)`
- `4px` → `var(--space-xs)`
- `0.75rem` → `var(--font-size-xs)`

**Status:** ✅ Complete

---

## Token Usage Patterns

### Color with Opacity

**Pattern:**
```css
/* Old */
background: rgba(14, 165, 233, 0.08);

/* New */
background: color-mix(in srgb, var(--primary) 8%, transparent);
```

**Fallback (if needed):**
```css
background: var(--glass-icon-bg, color-mix(in srgb, var(--primary) 8%, transparent));
```

### Spacing

**Pattern:**
```css
/* Old */
padding: 20px 28px 0;
gap: 4px;
margin-bottom: 12px;

/* New */
padding: var(--space-lg) var(--space-xl) 0;
gap: var(--space-xs);
margin-bottom: var(--space-md);
```

### Typography

**Pattern:**
```css
/* Old */
font-size: 36px;
font-size: 0.75rem;

/* New */
font-size: var(--font-size-3xl);
font-size: var(--font-size-xs);
```

### Semantic Colors

**Pattern:**
```css
/* Old */
color: #374151;
background: #fff;

/* New */
color: var(--text-body);
background: var(--surface);
```

---

## Remaining Hardcoded Values (Future Work)

The following components may still contain hardcoded values and should be migrated in future phases:

- Widget Container (`widget-container.component.ts`) — may have hardcoded rgba values
- Widget Shell (`widget-shell.component.ts`) — may have hardcoded spacing/colors
- Drill-Through Panel (`drill-through-panel.component.ts`) — may have hardcoded values
- Other feature-specific components

---

## Browser Support

**`color-mix()` Support:**
- Chrome/Edge 111+
- Firefox 113+
- Safari 16.2+

**Fallback Strategy:**
If older browser support is required, consider:
1. Using predefined glass effect tokens (e.g., `--glass-icon-bg`)
2. Defining rgba variants in design tokens file
3. Using CSS custom properties with calculated opacity

---

## Testing

After migration, verify:
1. Visual appearance matches previous design
2. Theme switching works correctly
3. Dark mode compatibility (if applicable)
4. Responsive behavior unchanged

---

## Related Documents

- `CANONICAL_COMPONENT_MAP.md` — Canonical component ownership
- `STATE_PATTERNS.md` — State pattern usage policy
- `CHART_POLICY.md` — Chart library usage policy
- `design-tokens.css` — Design token definitions
- `grc-tokens.css` — GRC-specific tokens
