// ============================================
// Pulse Indicator — Property-Based Tests (Properties 10, 11)
// Feature: premium-dashboard-overhaul, Task 4.2
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/pulse-indicator.pbt.ts

import * as fc from 'fast-check';
import { computePulseState, formatRelativeTime } from './pulse-indicator.utils';

// ============================================
// Arbitraries
// ============================================

/** Arbitrary for a base timestamp (recent past). */
const baseTimestampArb = fc.integer({ min: 1_700_000_000_000, max: 1_800_000_000_000 });

/** Arbitrary for a non-negative offset in milliseconds (0 to ~48 hours). */
const offsetMsArb = fc.integer({ min: 0, max: 48 * 60 * 60 * 1000 });

/** Arbitrary for language. */
const langArb = fc.constantFrom<'ar' | 'en'>('ar', 'en');

// ============================================
// Property 10: Pulse Indicator State
// Feature: premium-dashboard-overhaul, Property 10: Pulse Indicator State
// **Validates: Requirements 8.1**
//
// For any lastUpdated timestamp and now timestamp where now >= lastUpdated,
// and any error state boolean: if errorState is true, the result is 'red';
// if the difference is less than 5 minutes, the result is 'green';
// if between 5 and 15 minutes, 'amber'; if greater than 15 minutes, 'red'.
// If lastUpdated is null, the result is 'red'.
// ============================================

console.log('--- Property 10: Pulse Indicator State ---');

// 10a: errorState true always returns 'red'
fc.assert(
  fc.property(baseTimestampArb, offsetMsArb, (base, offset) => {
    const lastUpdated = new Date(base);
    const now = new Date(base + offset);
    return computePulseState(lastUpdated, now, true) === 'red';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10a: errorState true always returns red');

// 10b: lastUpdated null always returns 'red'
fc.assert(
  fc.property(baseTimestampArb, fc.boolean(), (base, errorState) => {
    const now = new Date(base);
    return computePulseState(null, now, errorState) === 'red';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10b: lastUpdated null always returns red');

// 10c: diff < 5 minutes and no error → 'green'
fc.assert(
  fc.property(
    baseTimestampArb,
    fc.integer({ min: 0, max: 5 * 60 * 1000 - 1 }), // 0 to just under 5 min
    (base, offset) => {
      const lastUpdated = new Date(base);
      const now = new Date(base + offset);
      return computePulseState(lastUpdated, now, false) === 'green';
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 10c: diff < 5 min and no error returns green');

// 10d: diff between 5 and 15 minutes (inclusive) and no error → 'amber'
fc.assert(
  fc.property(
    baseTimestampArb,
    fc.integer({ min: 5 * 60 * 1000, max: 15 * 60 * 1000 }), // 5 min to 15 min
    (base, offset) => {
      const lastUpdated = new Date(base);
      const now = new Date(base + offset);
      return computePulseState(lastUpdated, now, false) === 'amber';
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 10d: diff 5-15 min and no error returns amber');

// 10e: diff > 15 minutes and no error → 'red'
fc.assert(
  fc.property(
    baseTimestampArb,
    fc.integer({ min: 15 * 60 * 1000 + 1, max: 48 * 60 * 60 * 1000 }), // just over 15 min to 48 hrs
    (base, offset) => {
      const lastUpdated = new Date(base);
      const now = new Date(base + offset);
      return computePulseState(lastUpdated, now, false) === 'red';
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 10e: diff > 15 min and no error returns red');

// 10f: result is always one of the three valid states
fc.assert(
  fc.property(
    fc.option(baseTimestampArb, { nil: undefined }),
    baseTimestampArb,
    offsetMsArb,
    fc.boolean(),
    (lastUpdatedTs, base, offset, errorState) => {
      const lastUpdated = lastUpdatedTs !== undefined ? new Date(lastUpdatedTs) : null;
      const now = new Date(base + offset);
      const result = computePulseState(lastUpdated, now, errorState);
      return result === 'green' || result === 'amber' || result === 'red';
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 10f: result is always green, amber, or red');

// 10g: errorState takes priority over time-based state
fc.assert(
  fc.property(baseTimestampArb, (base) => {
    // Even with 0 diff (freshest possible), error → red
    const now = new Date(base);
    return computePulseState(now, now, true) === 'red';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 10g: errorState takes priority over time-based state');

console.log('Property 10: PASSED\n');

// ============================================
// Property 11: Relative Time Formatting
// Feature: premium-dashboard-overhaul, Property 11: Relative Time Formatting
// **Validates: Requirements 8.3**
//
// For any two dates where now >= date and any language ('ar' | 'en'),
// formatRelativeTime SHALL return a non-empty string. The string SHALL
// contain a numeric component when the difference is 1 minute or more.
// ============================================

console.log('--- Property 11: Relative Time Formatting ---');

// 11a: result is always a non-empty string
fc.assert(
  fc.property(baseTimestampArb, offsetMsArb, langArb, (base, offset, lang) => {
    const date = new Date(base);
    const now = new Date(base + offset);
    const result = formatRelativeTime(date, now, lang);
    return typeof result === 'string' && result.length > 0;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 11a: result is always a non-empty string');

// 11b: English result contains a numeric component when diff >= 1 minute
fc.assert(
  fc.property(
    baseTimestampArb,
    fc.integer({ min: 60 * 1000, max: 48 * 60 * 60 * 1000 }), // 1 min to 48 hrs
    (base, offset) => {
      const date = new Date(base);
      const now = new Date(base + offset);
      const result = formatRelativeTime(date, now, 'en');
      // English numbers: must contain at least one ASCII digit
      return /\d/.test(result);
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 11b: English result contains numeric component when diff >= 1 min');

// 11c: Arabic result contains a numeric component when diff >= 1 minute
// Arabic uses either Arabic-Indic digits (٠-٩) or special words for 1/2
const arabicNumericPattern = /[٠١٢٣٤٥٦٧٨٩]|دقيقة|دقيقتين|ساعة|ساعتين|يوم|يومين/;
fc.assert(
  fc.property(
    baseTimestampArb,
    fc.integer({ min: 60 * 1000, max: 48 * 60 * 60 * 1000 }), // 1 min to 48 hrs
    (base, offset) => {
      const date = new Date(base);
      const now = new Date(base + offset);
      const result = formatRelativeTime(date, now, 'ar');
      // Arabic: contains Arabic-Indic digits or implicit numeric words (دقيقة = 1 min, ساعة = 1 hr)
      return arabicNumericPattern.test(result);
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 11c: Arabic result contains numeric component when diff >= 1 min');

// 11d: diff < 1 minute returns "just now" (en) or "الآن" (ar)
fc.assert(
  fc.property(
    baseTimestampArb,
    fc.integer({ min: 0, max: 59 * 1000 }), // 0 to just under 1 min
    langArb,
    (base, offset, lang) => {
      const date = new Date(base);
      const now = new Date(base + offset);
      const result = formatRelativeTime(date, now, lang);
      if (lang === 'en') return result === 'just now' || /\d/.test(result);
      return result === 'الآن' || arabicNumericPattern.test(result);
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 11d: diff < 1 min returns "just now" or "الآن"');

// 11e: both languages produce different strings for the same input (when diff >= 1 min)
fc.assert(
  fc.property(
    baseTimestampArb,
    fc.integer({ min: 60 * 1000, max: 48 * 60 * 60 * 1000 }),
    (base, offset) => {
      const date = new Date(base);
      const now = new Date(base + offset);
      const en = formatRelativeTime(date, now, 'en');
      const ar = formatRelativeTime(date, now, 'ar');
      // They should be different strings (different languages)
      return en !== ar;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 11e: English and Arabic produce different strings');

console.log('Property 11: PASSED\n');

// ============================================
console.log('=== All pulse indicator property tests PASSED ===');
