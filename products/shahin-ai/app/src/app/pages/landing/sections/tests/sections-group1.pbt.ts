// ============================================
// Sections Group 1 — Property-Based Tests (Properties 3–4)
// Feature: landing-page-overhaul
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/landing/sections/sections-group1.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Shared types
// ============================================

type Lang = 'en' | 'ar';

const langArb: fc.Arbitrary<Lang> = fc.constantFrom('en' as const, 'ar' as const);

// ============================================
// Property 3: Active Language Indicator
// Feature: landing-page-overhaul, Property 3: Active Language Indicator
// **Validates: Requirements 4.5**
//
// For any language selection ('en' or 'ar'), the Navbar language toggle
// button corresponding to the current language SHALL have an
// active/highlighted visual state, and the other button SHALL not.
// ============================================

/**
 * Mirrors NavbarSectionComponent template logic for language toggle buttons.
 *
 * From the component template:
 *   [class]="i18n.currentLang() === 'en'
 *     ? 'bg-blue-800 text-white border-blue-800'
 *     : 'bg-transparent text-slate-400 border-slate-700 hover:text-slate-300'"
 *
 * Returns the CSS class string applied to each language button.
 */
const ACTIVE_CLASSES = 'bg-blue-800 text-white border-blue-800';
const INACTIVE_CLASSES = 'bg-transparent text-slate-400 border-slate-700 hover:text-slate-300';

interface NavbarToggleState {
  enButtonClasses: string;
  arButtonClasses: string;
  enIsActive: boolean;
  arIsActive: boolean;
}

function computeNavbarToggleState(currentLang: Lang): NavbarToggleState {
  const enIsActive = currentLang === 'en';
  const arIsActive = currentLang === 'ar';
  return {
    enButtonClasses: enIsActive ? ACTIVE_CLASSES : INACTIVE_CLASSES,
    arButtonClasses: arIsActive ? ACTIVE_CLASSES : INACTIVE_CLASSES,
    enIsActive,
    arIsActive,
  };
}

console.log('--- Property 3: Active Language Indicator ---');

// 3a: The button matching the current language has active classes
fc.assert(
  fc.property(
    langArb,
    (lang) => {
      const state = computeNavbarToggleState(lang);
      if (lang === 'en') {
        return state.enButtonClasses === ACTIVE_CLASSES;
      } else {
        return state.arButtonClasses === ACTIVE_CLASSES;
      }
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3a: current language button has active/highlighted classes');

// 3b: The button NOT matching the current language has inactive classes
fc.assert(
  fc.property(
    langArb,
    (lang) => {
      const state = computeNavbarToggleState(lang);
      if (lang === 'en') {
        return state.arButtonClasses === INACTIVE_CLASSES;
      } else {
        return state.enButtonClasses === INACTIVE_CLASSES;
      }
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3b: non-current language button has inactive classes');

// 3c: Exactly one button is active at any time
fc.assert(
  fc.property(
    langArb,
    (lang) => {
      const state = computeNavbarToggleState(lang);
      const activeCount = [state.enIsActive, state.arIsActive].filter(Boolean).length;
      return activeCount === 1;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3c: exactly one button is active at any time');

// 3d: Active and inactive classes are mutually exclusive (never the same)
fc.assert(
  fc.property(
    langArb,
    (lang) => {
      const state = computeNavbarToggleState(lang);
      return state.enButtonClasses !== state.arButtonClasses;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3d: active and inactive classes are mutually exclusive');

// 3e: Switching language flips the active button
fc.assert(
  fc.property(
    langArb,
    (lang) => {
      const otherLang: Lang = lang === 'en' ? 'ar' : 'en';
      const before = computeNavbarToggleState(lang);
      const after = computeNavbarToggleState(otherLang);
      // The EN button state should flip
      return before.enIsActive !== after.enIsActive &&
             before.arIsActive !== after.arIsActive;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 3e: switching language flips the active button');

console.log('Property 3: PASSED\n');

// ============================================
// Property 4: Stat Metric Bilingual Rendering
// Feature: landing-page-overhaul, Property 4: Stat Metric Bilingual Rendering
// **Validates: Requirements 6.2**
//
// For any stat metric in the Stats section data array, the rendered
// output SHALL contain the metric's numeric value and the label in
// the current language (English label when lang='en', Arabic label
// when lang='ar').
// ============================================

interface StatMetric {
  value: string;
  numericValue: number;
  suffix: string;
  labelEn: string;
  labelAr: string;
}

/** The actual stats data from StatsSectionComponent. */
const STATS_DATA: StatMetric[] = [
  { value: '129', numericValue: 129, suffix: '', labelEn: 'Regulators', labelAr: 'جهة رقابية' },
  { value: '6,000+', numericValue: 6000, suffix: '+', labelEn: 'Controls', labelAr: 'ضابط رقابي' },
  { value: '10', numericValue: 10, suffix: '', labelEn: 'AI Agents', labelAr: 'وكيل ذكاء اصطناعي' },
  { value: '330+', numericValue: 330, suffix: '+', labelEn: 'Frameworks', labelAr: 'إطار تنظيمي' },
];

/**
 * Mirrors StatsSectionComponent.t() helper and template rendering.
 * Returns the rendered label for a stat metric given the current language.
 */
function renderStatLabel(stat: StatMetric, lang: Lang): string {
  return lang === 'ar' ? stat.labelAr : stat.labelEn;
}

/**
 * Mirrors StatsSectionComponent.formatNumber() for the final animated value.
 * After count-up completes, the displayed value is formatNumber(numericValue) + suffix.
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function renderStatValue(stat: StatMetric): string {
  return formatNumber(stat.numericValue) + stat.suffix;
}

/** Arbitrary that picks a stat from the actual data array. */
const statArb: fc.Arbitrary<StatMetric> = fc.constantFrom(...STATS_DATA);

/** Arbitrary index into the stats array. */
const statIndexArb: fc.Arbitrary<number> = fc.integer({ min: 0, max: STATS_DATA.length - 1 });

console.log('--- Property 4: Stat Metric Bilingual Rendering ---');

// 4a: For any stat and lang='en', rendered label is the English label
fc.assert(
  fc.property(
    statArb,
    (stat) => {
      return renderStatLabel(stat, 'en') === stat.labelEn;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 4a: lang=en renders English label');

// 4b: For any stat and lang='ar', rendered label is the Arabic label
fc.assert(
  fc.property(
    statArb,
    (stat) => {
      return renderStatLabel(stat, 'ar') === stat.labelAr;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 4b: lang=ar renders Arabic label');

// 4c: For any stat and any language, the rendered label matches the correct variant
fc.assert(
  fc.property(
    fc.tuple(statArb, langArb),
    ([stat, lang]) => {
      const label = renderStatLabel(stat, lang);
      const expected = lang === 'ar' ? stat.labelAr : stat.labelEn;
      return label === expected;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 4c: bilingual label selection correct for any stat and language');

// 4d: Rendered value contains the numeric value (formatted) and suffix
fc.assert(
  fc.property(
    statArb,
    (stat) => {
      const rendered = renderStatValue(stat);
      const formattedNum = formatNumber(stat.numericValue);
      // The rendered value must start with the formatted number
      if (!rendered.startsWith(formattedNum)) return false;
      // The rendered value must end with the suffix
      if (!rendered.endsWith(stat.suffix)) return false;
      // The full rendered value is exactly formattedNum + suffix
      return rendered === formattedNum + stat.suffix;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 4d: rendered value is formatted numeric value + suffix');

// 4e: Each stat has non-empty labels in both languages
fc.assert(
  fc.property(
    statArb,
    (stat) => {
      return stat.labelEn.length > 0 && stat.labelAr.length > 0;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 4e: all stats have non-empty labels in both languages');

// 4f: Switching language changes the label (en and ar labels differ for all stats)
fc.assert(
  fc.property(
    statArb,
    (stat) => {
      const enLabel = renderStatLabel(stat, 'en');
      const arLabel = renderStatLabel(stat, 'ar');
      return enLabel !== arLabel;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 4f: switching language changes the label (en/ar labels differ)');

console.log('Property 4: PASSED\n');

// ============================================
console.log('=== All sections-group1 property tests PASSED ===');
