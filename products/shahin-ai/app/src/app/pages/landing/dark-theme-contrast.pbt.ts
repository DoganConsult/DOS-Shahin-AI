// ============================================
// Dark Theme Token Contrast Preservation — Property-Based Test (Property 9)
// Feature: ux-journey-evaluation, Property 9: Dark theme token contrast preservation
// **Validates: Requirements 8.4**
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/pages/landing/dark-theme-contrast.pbt.ts

import * as fc from 'fast-check';

// ============================================
// WCAG Contrast Ratio Helpers (same as light theme PBT)
// ============================================

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================
// Dark Theme Token Definitions (from [data-theme="dark"])
// ============================================

const TEXT_COLORS = [
  { name: '--text-heading', hex: 'var(--status-info-bg, #edf5ff)' },
  { name: '--text-body', hex: '#e2e8f0' },
  { name: '--text-muted', hex: '#94a3b8' },
  { name: '--text-on-primary', hex: '#0f172a' },
] as const;

const BG_COLORS = [
  { name: '--surface', hex: '#0f172a' },
  { name: '--surface-ice', hex: '#1e293b' },
  { name: '--surface-sunken', hex: '#0b1120' },
  { name: '--surface-lavender', hex: '#1a1625' },
  { name: '--surface-mint', hex: '#0d1f17' },
  { name: '--surface-amber', hex: '#1a1608' },
  { name: '--primary', hex: '#38bdf8' },
  { name: '--primary-dark', hex: '#0ea5e9' },
  { name: '--primary-darker', hex: '#7dd3fc' },
] as const;

const FONT_SIZES = [11, 13, 14, 16, 20, 28, 40, 56] as const;

// ============================================
// Build all valid text/background/size combinations
// ============================================

interface ColorPair {
  textName: string;
  textHex: string;
  bgName: string;
  bgHex: string;
  fontSize: number;
}

const ALL_PAIRS: ColorPair[] = [];
for (const text of TEXT_COLORS) {
  for (const bg of BG_COLORS) {
    for (const size of FONT_SIZES) {
      ALL_PAIRS.push({
        textName: text.name,
        textHex: text.hex,
        bgName: bg.name,
        bgHex: bg.hex,
        fontSize: size,
      });
    }
  }
}

function requiredRatio(fontSize: number): number {
  return fontSize >= 18 ? 3.0 : 4.5;
}

// ============================================
// Intentional pair filtering — same approach as light theme.
// --text-on-primary (#0f172a, dark text) is only used on bright/primary surfaces.
// --text-heading/body/muted (light text) are used on dark surfaces.
// ============================================

function isIntentionalPair(pair: ColorPair): boolean {
  const darkSurfaces = [
    '--surface', '--surface-ice', '--surface-sunken',
    '--surface-lavender', '--surface-mint', '--surface-amber',
  ];
  // --text-on-primary is dark text (#0f172a) — only placed on bright backgrounds
  const brightBgs = ['--primary', '--primary-dark', '--primary-darker'];

  if (pair.textName === '--text-on-primary') {
    return brightBgs.includes(pair.bgName);
  }

  // Light text tokens are used on dark surfaces
  return darkSurfaces.includes(pair.bgName);
}

const INTENTIONAL_PAIRS = ALL_PAIRS.filter(isIntentionalPair);

// ============================================
// Property 9: Dark theme token contrast preservation
// Feature: ux-journey-evaluation, Property 9: Dark theme token contrast preservation
// **Validates: Requirements 8.4**
//
// For any text-color/background-color pair in the dark theme token set,
// the computed contrast ratio SHALL meet the same WCAG AA thresholds
// as the light theme (4.5:1 for body, 3:1 for large text).
// ============================================

const pairArb = fc.constantFrom(...INTENTIONAL_PAIRS);

console.log('--- Property 9: Dark Theme Token Contrast Preservation ---');
console.log(`  Total intentional text/bg/size combinations: ${INTENTIONAL_PAIRS.length}`);

// 9a: All intentional dark-theme text/background pairs meet WCAG AA contrast thresholds
fc.assert(
  fc.property(
    pairArb,
    (pair) => {
      const ratio = contrastRatio(pair.textHex, pair.bgHex);
      const minRequired = requiredRatio(pair.fontSize);
      if (ratio < minRequired) {
        console.error(
          `  FAIL: ${pair.textName} (${pair.textHex}) on ${pair.bgName} (${pair.bgHex}) ` +
          `at ${pair.fontSize}px → ratio ${ratio.toFixed(2)}:1 (need ${minRequired}:1)`
        );
      }
      return ratio >= minRequired;
    }
  ),
  { numRuns: 500 }
);
console.log('  ✓ 9a: all intentional dark-theme text/bg pairs meet WCAG AA contrast thresholds');

// 9b: Body text (< 18px) on dark surfaces meets 4.5:1
const bodyPairs = INTENTIONAL_PAIRS.filter(p => p.fontSize < 18);
const bodyPairArb = fc.constantFrom(...bodyPairs);

fc.assert(
  fc.property(
    bodyPairArb,
    (pair) => {
      const ratio = contrastRatio(pair.textHex, pair.bgHex);
      return ratio >= 4.5;
    }
  ),
  { numRuns: 500 }
);
console.log('  ✓ 9b: all body text (< 18px) dark-theme pairs meet 4.5:1 minimum');

// 9c: Large text (>= 18px) on dark surfaces meets 3:1
const largePairs = INTENTIONAL_PAIRS.filter(p => p.fontSize >= 18);
const largePairArb = fc.constantFrom(...largePairs);

fc.assert(
  fc.property(
    largePairArb,
    (pair) => {
      const ratio = contrastRatio(pair.textHex, pair.bgHex);
      return ratio >= 3.0;
    }
  ),
  { numRuns: 500 }
);
console.log('  ✓ 9c: all large text (>= 18px) dark-theme pairs meet 3:1 minimum');

// 9d: Contrast ratio symmetry holds for dark theme pairs
fc.assert(
  fc.property(
    pairArb,
    (pair) => {
      const r1 = contrastRatio(pair.textHex, pair.bgHex);
      const r2 = contrastRatio(pair.bgHex, pair.textHex);
      return Math.abs(r1 - r2) < 0.001;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 9d: contrast ratio is symmetric for dark theme pairs');

// 9e: Contrast ratio is always >= 1 (mathematical invariant)
fc.assert(
  fc.property(
    pairArb,
    (pair) => {
      const ratio = contrastRatio(pair.textHex, pair.bgHex);
      return ratio >= 1.0;
    }
  ),
  { numRuns: 200 }
);
console.log('  ✓ 9e: contrast ratio is always >= 1.0 for dark theme pairs');

console.log('\nProperty 9: PASSED');
console.log('=== Dark theme token contrast preservation property tests PASSED ===');
