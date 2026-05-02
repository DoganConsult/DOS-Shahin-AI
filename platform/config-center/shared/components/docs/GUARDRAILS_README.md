# UI Foundation Guardrails

**Version:** 1.0.0  
**Phase:** G - Guardrails  
**Status:** Active

---

## Overview

This directory contains guardrail tests that prevent frontend drift and ensure the UI foundation remains unified. These tests are run as part of CI/CD and can be executed locally.

---

## Test Files

### 1. `ui-foundation-selector-conflict.test.ts`

**Purpose:** Detects duplicate selectors for critical UI foundation components.

**What it checks:**
- Critical selectors (`app-widget-shell`, `app-global-search`, `app-scope-filter-bar`, `app-layout-sidebar`) have exactly one canonical implementation
- Deprecated selectors don't conflict with canonical ones
- Canonical components are in expected paths

**Run:**
```bash
npx tsx src/app/shared/components/ui-foundation-selector-conflict.test.ts
```

**Failure conditions:**
- Multiple implementations of a critical selector
- Canonical component missing
- Canonical component in wrong location

---

### 2. `ui-foundation-component-ownership.test.ts`

**Purpose:** Verifies canonical components exist and deprecated components are properly marked.

**What it checks:**
- All canonical components exist at expected paths
- Deprecated components are marked with `@deprecated` JSDoc
- Canonical components are standalone
- `CANONICAL_COMPONENT_MAP.md` references all canonical components

**Run:**
```bash
npx tsx src/app/shared/components/ui-foundation-component-ownership.test.ts
```

**Failure conditions:**
- Canonical component missing
- Deprecated component not marked
- Component not standalone when it should be
- Documentation missing

---

### 3. `ui-foundation-token-governance.test.ts`

**Purpose:** Ensures canonical components use design tokens instead of hardcoded values.

**What it checks:**
- Hardcoded hex colors are minimized (allows up to 5 per component)
- Design token files exist (`design-tokens.css`, `grc-tokens.css`)
- Migrated components use CSS variables (`var(--...)`)
- Token migration documentation exists

**Run:**
```bash
npx tsx src/app/shared/components/ui-foundation-token-governance.test.ts
```

**Failure conditions:**
- Excessive hardcoded colors (>5 per component)
- Design token files missing
- Migrated components don't use CSS variables

---

### 4. `ui-foundation-integration-verification.test.ts`

**Purpose:** Verifies that canonical components are properly exported and accessible across the platform.

**What it checks:**
- All canonical components exist at expected paths
- Barrel exports exist for convenient imports
- Integration documentation exists and is complete
- Components are standalone (as required)
- Barrel exports export correct components
- Integration setup documentation includes examples and patterns

**Run:**
```bash
npx tsx src/app/shared/components/ui-foundation-integration-verification.test.ts
```

**Failure conditions:**
- Canonical component missing
- Barrel export missing
- Documentation missing or incomplete
- Component not standalone
- Barrel export doesn't export expected components

---

## Running All Tests

Run all guardrail tests:

```bash
npx tsx src/app/shared/components/ui-foundation-*.test.ts
```

Or individually:

```bash
npx tsx src/app/shared/components/ui-foundation-selector-conflict.test.ts
npx tsx src/app/shared/components/ui-foundation-component-ownership.test.ts
npx tsx src/app/shared/components/ui-foundation-token-governance.test.ts
npx tsx src/app/shared/components/ui-foundation-integration-verification.test.ts
```

---

## CI Integration

These tests should be run as part of:

1. **Pre-commit hooks** (optional, but recommended)
2. **PR checks** (mandatory)
3. **Build pipeline** (mandatory)

Example CI step:

```yaml
- name: Run UI Foundation Guardrails
  run: |
    npx tsx src/app/shared/components/ui-foundation-selector-conflict.test.ts
    npx tsx src/app/shared/components/ui-foundation-component-ownership.test.ts
    npx tsx src/app/shared/components/ui-foundation-token-governance.test.ts
    npx tsx src/app/shared/components/ui-foundation-integration-verification.test.ts
```

---

## Adding New Guardrails

When adding new guardrails:

1. Create a new `ui-foundation-*.test.ts` file following the existing pattern
2. Use the `assert()` helper function
3. Read source files with `readFileSync` to check patterns
4. Document the test in this README
5. Add to CI pipeline

**Test pattern:**
```typescript
import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

console.log('--- Test Name ---\n');

// Your tests here

console.log('\n=== All Tests PASSED ===');
```

---

## Related Documentation

- `CANONICAL_COMPONENT_MAP.md` - Canonical component definitions
- `DEPRECATION_MAP.md` - Deprecated component migration paths
- `PLATFORM_INTEGRATION_SETUP.md` - Complete integration guide and examples
- `DESIGN_TOKEN_MIGRATION.md` - Token migration status
- `CHART_POLICY.md` - Chart library usage policy
- `STATE_PATTERNS.md` - State pattern policies

---

## Maintenance

These guardrails should be updated when:

- New canonical components are added
- Deprecated components are removed
- Design token patterns change
- Component ownership changes

Update the test files and this README accordingly.
