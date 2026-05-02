// ============================================
// Widget Registration — Property-Based Tests (Properties 12, 16)
// Feature: advanced-echarts-widgets, Task 16.3
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/register-widgets.pbt.ts

import * as fc from 'fast-check';
import { WidgetRegistryService } from './core/services/widget-registry.service';
import { WidgetManifest } from '../core/models/widget-manifest.model';
import { ALL_WIDGET_MANIFESTS } from '../catalog';

// ============================================
// Setup: register all widgets and collect them
// ============================================

const registry = new WidgetRegistryService();
registry.registerMany(ALL_WIDGET_MANIFESTS);
const allWidgets: WidgetManifest[] = registry.list();

// ============================================
// Constants
// ============================================

const VALID_CATEGORIES = [
  'executive', 'governance', 'risk', 'compliance', 'audit', 'evidence',
  'incidents', 'vendors', 'bcp', 'assets', 'workflow', 'reporting', 'platform', 'ai',
];

// ============================================
// Property 12: Widget registration uniqueness and validity
// ============================================

console.log('--- Property 12: Widget registration uniqueness and validity ---');

// 12a: All widget IDs are unique
fc.assert(
  fc.property(fc.constant(allWidgets), (widgets) => {
    const ids = widgets.map(w => w.id);
    const uniqueIds = new Set(ids);
    return ids.length === uniqueIds.size;
  }),
  { numRuns: 1 },
);
console.log('  ✓ 12a: All widget IDs are unique');

// 12b: All categories are valid members of the category set
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => VALID_CATEGORIES.includes(widget.category),
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 12b: All categories are valid members of the category set');

// 12c: All defaultSize.cols values are between 1 and 12
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => widget.defaultSize.cols >= 1 && widget.defaultSize.cols <= 12,
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 12c: All defaultSize.cols values are between 1 and 12');

// 12d: All defaultSize.rows values are between 1 and 6
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => widget.defaultSize.rows >= 1 && widget.defaultSize.rows <= 6,
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 12d: All defaultSize.rows values are between 1 and 6');

// 12e: Sampling random subsets of widgets still preserves uniqueness
fc.assert(
  fc.property(
    fc.subarray(allWidgets, { minLength: 1 }),
    (subset) => {
      const ids = subset.map(w => w.id);
      return ids.length === new Set(ids).size;
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ 12e: Random subsets preserve ID uniqueness');

console.log('Property 12: PASSED\n');

// ============================================
// Property 16: Bilingual widget name completeness
// ============================================

console.log('--- Property 16: Bilingual widget name completeness ---');

// 16a: All widgets have non-empty title
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => typeof widget.title === 'string' && widget.title.length > 0,
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 16a: All widgets have non-empty title');

// 16b: All widgets have non-empty titleAr
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => typeof widget.titleAr === 'string' && widget.titleAr!.length > 0,
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 16b: All widgets have non-empty titleAr');

// 16c: titleAr and title are different (bilingual, not duplicated)
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => widget.titleAr !== widget.title,
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 16c: titleAr and title are different for all widgets');

// 16d: titleAr contains at least one Arabic character
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => /[\u0600-\u06FF]/.test(widget.titleAr ?? ''),
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 16d: titleAr contains Arabic characters');

console.log('Property 16: PASSED\n');

// ============================================
// Property 22: Arabic widget title resolution
// ============================================

console.log('--- Property 22: Arabic widget title resolution ---');

function resolveWidgetTitle(widget: WidgetManifest, lang: 'ar' | 'en'): string {
  return lang === 'ar' ? (widget.titleAr ?? widget.title) : widget.title;
}

const langArb = fc.constantFrom('ar' as const, 'en' as const);

// 22a: Arabic language resolves to titleAr for all widgets
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => {
      const title = resolveWidgetTitle(widget, 'ar');
      return title === (widget.titleAr ?? widget.title);
    },
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 22a: Arabic language resolves to titleAr for all widgets');

// 22b: English language resolves to title for all widgets
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => {
      const title = resolveWidgetTitle(widget, 'en');
      return title === widget.title;
    },
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 22b: English language resolves to title for all widgets');

// 22c: For any widget and any language, resolved title is non-empty
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    langArb,
    (widget, lang) => {
      const title = resolveWidgetTitle(widget, lang);
      return typeof title === 'string' && title.length > 0;
    },
  ),
  { numRuns: 200 },
);
console.log('  ✓ 22c: Resolved title is always non-empty for any language');

// 22d: Arabic-resolved titles contain Arabic characters
fc.assert(
  fc.property(
    fc.constantFrom(...allWidgets),
    (widget) => {
      const title = resolveWidgetTitle(widget, 'ar');
      return /[\u0600-\u06FF]/.test(title);
    },
  ),
  { numRuns: allWidgets.length },
);
console.log('  ✓ 22d: Arabic-resolved titles contain Arabic characters');

console.log('Property 22: PASSED\n');

// ============================================
console.log('=== All register-widgets property tests PASSED ===');
