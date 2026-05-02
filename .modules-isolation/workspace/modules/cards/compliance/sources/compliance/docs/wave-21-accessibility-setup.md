# Wave 21 — WCAG 2.1 AA Accessibility Setup

**Goal**: every compliance frontend page passes WCAG 2.1 A + AA with zero `critical` or `serious` axe-core violations.

This document describes how to wire the auditing toolchain. The page list lives at [tests/accessibility/wcag-2.1-aa.spec.ts](tests/accessibility/wcag-2.1-aa.spec.ts) (canonical compliance-side surface; consumed by the SPA's Playwright runner).

---

## §1 — Why WCAG 2.1 AA

- **US Section 508 (Rehabilitation Act §508)**: federal procurement requirement.
- **EU Web Accessibility Directive 2016/2102**: public-sector websites in EU member states.
- **KSA Government Procurement**: KSA NCA-procurement frameworks reference WCAG 2.1.
- **Customer expectation** for any enterprise procurement RFP: WCAG 2.1 AA conformance statement.

## §2 — Toolchain

| Tool | Purpose |
|------|---------|
| `@playwright/test` | Browser orchestration |
| `@axe-core/playwright` | axe-core integration for Playwright |
| `axe-core` | Accessibility rules engine |
| `pa11y-ci` (optional) | CLI smoke gate for CI |

Install in `products/shahin-ai/app/`:
```bash
pnpm add -D @playwright/test @axe-core/playwright axe-core
```

## §3 — Runner skeleton

Add at `products/shahin-ai/app/tests/a11y/compliance.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  COMPLIANCE_A11Y_PAGES,
  A11Y_RULE_TAGS,
  A11Y_FAIL_BAR,
} from '@dos/module-compliance/tests/accessibility/wcag-2.1-aa.spec';

const STAGING_BASE = process.env.A11Y_BASE_URL ?? 'https://staging.shahin-ai.com';

for (const page of COMPLIANCE_A11Y_PAGES) {
  test(`a11y ${page.componentKey} — ${page.route}`, async ({ page: pwPage }) => {
    await pwPage.goto(`${STAGING_BASE}${page.route}`);
    await pwPage.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page: pwPage })
      .withTags(A11Y_RULE_TAGS)
      .analyze();
    const failing = results.violations.filter((v) =>
      A11Y_FAIL_BAR.includes(v.impact as 'critical' | 'serious')
    );
    expect(failing, JSON.stringify(failing, null, 2)).toEqual([]);
  });
}
```

## §4 — Run cadence

| When | What |
|------|------|
| **PR CI gate** | every changed page audited; merge blocked on critical/serious |
| **Nightly** | full COMPLIANCE_A11Y_PAGES sweep; report posted to `#compliance-a11y` |
| **Pre-Wave-9-promotion** | full sweep + manual screen-reader audit (NVDA + VoiceOver + JAWS) |
| **Quarterly** | re-audit + WCAG conformance statement refresh |

## §5 — Severity bar

axe assigns each violation a severity:
- **critical**: page is unusable (e.g., images with no alt; form inputs without labels)
- **serious**: significant barrier (e.g., insufficient color contrast; keyboard-trapped widget)
- **moderate**: usability friction (e.g., heading hierarchy gap)
- **minor**: cosmetic suggestion

**Wave 21 fail bar**: `critical` and `serious` block merge / promotion.
`moderate` and `minor` are tracked but do not block.

## §6 — Common compliance-page a11y pitfalls

1. **Color contrast in framework heat-maps**: status colors (red/yellow/green) often fail 4.5:1 contrast on white; use SC 1.4.11 non-text contrast 3:1 + add icon redundancy.
2. **Tables with sortable headers**: ensure `aria-sort` and keyboard activation.
3. **Modal dialogs**: trap focus, return focus on close, `aria-modal="true"`, `Escape` closes.
4. **Form validation**: errors associated to inputs via `aria-describedby`, not just visual.
5. **Live-update regions** (real-time posture): `aria-live="polite"` for non-urgent, `assertive` for critical.
6. **Arabic / RTL**: full `dir="rtl"` in `<html>`, mirrored layouts, screen-reader navigation in correct reading order.
7. **Dynamic UI components**: every component_key in `db/seeds/dynamic-ui/index.json` has the spec entry above.

## §7 — Manual audit checklist (pre-promotion)

Beyond axe (covers ~30% of WCAG):
- [ ] Keyboard-only navigation through every flow (Tab, Shift-Tab, Enter, Esc, arrow keys).
- [ ] Screen reader (NVDA Windows / VoiceOver macOS+iOS / JAWS) on top 5 flows.
- [ ] Zoom 200% no horizontal scroll on 1280×1024 viewport.
- [ ] Content reflow at 320 CSS px width.
- [ ] Reduced motion (`prefers-reduced-motion: reduce`) honored.
- [ ] High-contrast mode (Windows + macOS) renders correctly.
- [ ] Forms work with browser autofill.
- [ ] Time limits (e.g., session expiry warnings) extendable.

## §8 — Conformance statement

Once all pages pass and manual audit clears, publish at
`https://shahin-ai.com/compliance/accessibility-statement` per WCAG 2.1
template:
- conformance level (AA)
- date of last audit
- known partial-conformance items (if any)
- contact for accessibility issues
- complaints procedure

---

**Status as of 2026-04-30**: scaffold only; per-page audits not yet executed.
**Acceptance**: 100% of `COMPLIANCE_A11Y_PAGES` entries flipped to `audited: true` with a passing axe report committed to `docs/a11y-reports/`.
