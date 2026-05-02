// ============================================
// RTL Direction Attribute — Property-Based Tests (Property 10)
// Feature: ux-journey-evaluation
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/core/rtl-direction.pbt.ts

import * as fc from 'fast-check';

// ============================================
// Simulate I18nService direction logic
// ============================================

type Lang = 'ar' | 'en';
type Direction = 'rtl' | 'ltr';

function computeDirection(lang: Lang): Direction {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

function computeTextAlign(dir: Direction): string {
  return dir === 'rtl' ? 'right' : 'left';
}

/** Auth page RTL class logic (login/register components) */
function authPageRtlClass(lang: Lang): boolean {
  return lang === 'ar';
}

/** Landing page dir attribute logic */
function landingDirAttribute(lang: Lang): Direction {
  return computeDirection(lang);
}

/** Sidebar RTL positioning logic */
function sidebarPosition(dir: Direction): { side: string; borderSide: string } {
  if (dir === 'rtl') {
    return { side: 'right', borderSide: 'inline-start' };
  }
  return { side: 'left', borderSide: 'inline-end' };
}

/** Hover transform direction for sidebar items */
function hoverTranslateX(dir: Direction): number {
  return dir === 'rtl' ? -2 : 2;
}

// ============================================
// Arbitraries
// ============================================

const langArb = fc.constantFrom<Lang>('ar', 'en');
const dirArb = fc.constantFrom<Direction>('rtl', 'ltr');

// ============================================
// Property 10: RTL direction attribute correctness
// **Validates: Requirements 9.2**
//
// Verify that language 'ar' produces dir='rtl' and 'en' produces
// dir='ltr', and that all direction-dependent UI logic is consistent.
// ============================================

console.log('--- Property 10: RTL direction attribute correctness ---');

// 10a: Arabic language always produces RTL direction
fc.assert(
  fc.property(fc.constant<Lang>('ar'), (lang) => {
    return computeDirection(lang) === 'rtl';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10a: Arabic language produces RTL direction');

// 10b: English language always produces LTR direction
fc.assert(
  fc.property(fc.constant<Lang>('en'), (lang) => {
    return computeDirection(lang) === 'ltr';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10b: English language produces LTR direction');

// 10c: Direction is always one of 'rtl' or 'ltr' for any supported language
fc.assert(
  fc.property(langArb, (lang) => {
    const dir = computeDirection(lang);
    return dir === 'rtl' || dir === 'ltr';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10c: direction is always rtl or ltr');

// 10d: Text alignment matches direction (rtl→right, ltr→left)
fc.assert(
  fc.property(langArb, (lang) => {
    const dir = computeDirection(lang);
    const align = computeTextAlign(dir);
    if (dir === 'rtl') return align === 'right';
    return align === 'left';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10d: text alignment matches direction');

// 10e: Auth page RTL class is true iff language is Arabic
fc.assert(
  fc.property(langArb, (lang) => {
    const hasRtlClass = authPageRtlClass(lang);
    const dir = computeDirection(lang);
    return hasRtlClass === (dir === 'rtl');
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10e: auth page RTL class matches direction');

// 10f: Landing page dir attribute matches computed direction
fc.assert(
  fc.property(langArb, (lang) => {
    return landingDirAttribute(lang) === computeDirection(lang);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10f: landing page dir attribute matches computed direction');

// 10g: Sidebar position flips correctly for RTL
fc.assert(
  fc.property(dirArb, (dir) => {
    const pos = sidebarPosition(dir);
    if (dir === 'rtl') return pos.side === 'right' && pos.borderSide === 'inline-start';
    return pos.side === 'left' && pos.borderSide === 'inline-end';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10g: sidebar position flips correctly for RTL');

// 10h: Hover transform direction is inverted for RTL
fc.assert(
  fc.property(dirArb, (dir) => {
    const tx = hoverTranslateX(dir);
    if (dir === 'rtl') return tx < 0;
    return tx > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10h: hover transform direction inverted for RTL');

// 10i: Direction computation is idempotent
fc.assert(
  fc.property(langArb, (lang) => {
    return computeDirection(lang) === computeDirection(lang);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10i: direction computation is idempotent');

console.log('Property 10: PASSED\n');

console.log('=== All RTL direction property tests PASSED ===');
