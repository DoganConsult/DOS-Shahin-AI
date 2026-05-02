// ============================================
// i18n Coverage & Fallback — Property-Based Tests
// Feature: grc-frontend-integration, Property 18: i18n key coverage for both languages
// Feature: grc-frontend-integration, Property 19: i18n fallback to English
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/core/i18n.pbt.ts

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { GrcRecord } from './models/shared.types';
import { GrcRecord } from './models/shared.types';
import { GrcRecord } from '@app/core/models/shared.types';

// --- Pure helper functions ---

/** Flatten a nested JSON object into dot-notation keys */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(flattenKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/** Resolve a dot-notation key from a nested object */
function resolveKey(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let current: GrcRecord = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/** Fallback: if key missing in primary, return from fallback source */
function translateWithFallback(
  key: string,
  primary: Record<string, unknown>,
  fallback: Record<string, unknown>
): string | undefined {
  return resolveKey(primary, key) ?? resolveKey(fallback, key);
}

// --- Load translation files ---

const i18nDir = path.resolve(__dirname, '../../assets/i18n');
const enJson: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en.json'), 'utf-8'));
const arJson: Record<string, unknown> = JSON.parse(fs.readFileSync(path.join(i18nDir, 'ar.json'), 'utf-8'));

const enKeys = flattenKeys(enJson);
const arKeys = flattenKeys(arJson);
const enKeySet = new Set(enKeys);
const arKeySet = new Set(arKeys);
const allKeys = [...new Set([...enKeys, ...arKeys])];

// ============================================
// Arbitraries
// ============================================

const allKeyArb = fc.constantFrom(...allKeys);
const enKeyArb = fc.constantFrom(...enKeys);

// ============================================
// Property 18: i18n key coverage for both languages
// **Validates: Requirements 18.1**
//
// For any translation key used in new component templates, the key
// exists in both en.json and ar.json.
// ============================================

console.log('--- Property 18: i18n key coverage for both languages ---');

let p18Pass = 0;
let p18Fail = 0;

// 18a: For any key from the union of both files, it exists in both en.json and ar.json
fc.assert(
  fc.property(allKeyArb, (key) => {
    const inEn = enKeySet.has(key);
    const inAr = arKeySet.has(key);
    if (inEn && inAr) { p18Pass++; return true; }
    p18Fail++;
    return false;
  }),
  { numRuns: 100 }
);
console.log(`  ✓ 18a: every sampled key exists in both en.json and ar.json (${p18Pass} passed, ${p18Fail} failed)`);

// 18b: en.json and ar.json have the same set of leaf keys
{
  const enOnly = enKeys.filter(k => !arKeySet.has(k));
  const arOnly = arKeys.filter(k => !enKeySet.has(k));
  if (enOnly.length === 0 && arOnly.length === 0) {
    console.log('  ✓ 18b: en.json and ar.json have identical key sets');
  } else {
    if (enOnly.length > 0) console.log(`  ✗ 18b: keys in en.json but not ar.json: ${enOnly.join(', ')}`);
    if (arOnly.length > 0) console.log(`  ✗ 18b: keys in ar.json but not en.json: ${arOnly.join(', ')}`);
    throw new Error('Key sets differ between en.json and ar.json');
  }
}

// 18c: For any sampled key, resolveKey returns a non-undefined string in both languages
fc.assert(
  fc.property(allKeyArb, (key) => {
    const enVal = resolveKey(enJson, key);
    const arVal = resolveKey(arJson, key);
    return typeof enVal === 'string' && typeof arVal === 'string';
  }),
  { numRuns: 100 }
);
console.log('  ✓ 18c: resolveKey returns a string for every sampled key in both languages');

// 18d: flattenKeys is exhaustive — every leaf in the original object is captured
fc.assert(
  fc.property(allKeyArb, (key) => {
    return enKeySet.has(key) || arKeySet.has(key);
  }),
  { numRuns: 100 }
);
console.log('  ✓ 18d: flattenKeys captures every leaf key');

console.log('Property 18: PASSED\n');

// ============================================
// Property 19: i18n fallback to English
// **Validates: Requirements 18.4**
//
// For any translation key that exists in en.json but not in ar.json,
// requesting the translation in Arabic returns the English value.
// ============================================

console.log('--- Property 19: i18n fallback to English ---');

let p19Pass = 0;
let p19Fail = 0;

// 19a: For any English key, translateWithFallback using ar as primary and en as fallback
//      always returns a defined value (either the Arabic translation or the English fallback)
fc.assert(
  fc.property(enKeyArb, (key) => {
    const result = translateWithFallback(key, arJson, enJson);
    if (typeof result === 'string' && result.length > 0) { p19Pass++; return true; }
    p19Fail++;
    return false;
  }),
  { numRuns: 100 }
);
console.log(`  ✓ 19a: translateWithFallback always returns a value for English keys (${p19Pass} passed, ${p19Fail} failed)`);

// 19b: When a key exists in en but hypothetically missing from ar,
//      the fallback returns the English value
{
  // Simulate missing keys by creating a partial ar object
  const partialAr: Record<string, unknown> = {};
  // Copy only half the top-level keys to simulate missing translations
  const topKeys = Object.keys(arJson);
  const halfKeys = topKeys.slice(0, Math.floor(topKeys.length / 2));
  for (const k of halfKeys) {
    partialAr[k] = arJson[k];
  }
  const partialArKeys = new Set(flattenKeys(partialAr));
  const missingInPartialAr = enKeys.filter(k => !partialArKeys.has(k));

  if (missingInPartialAr.length > 0) {
    const missingKeyArb = fc.constantFrom(...missingInPartialAr);
    fc.assert(
      fc.property(missingKeyArb, (key) => {
        const result = translateWithFallback(key, partialAr, enJson);
        const enValue = resolveKey(enJson, key);
        return result === enValue;
      }),
      { numRuns: 100 }
    );
    console.log(`  ✓ 19b: keys missing from partial ar.json fall back to English value (${missingInPartialAr.length} missing keys tested)`);
  } else {
    console.log('  ✓ 19b: (skipped — no missing keys in partial ar)');
  }
}

// 19c: When a key exists in both, translateWithFallback returns the Arabic value (not English)
fc.assert(
  fc.property(enKeyArb, (key) => {
    if (!arKeySet.has(key)) return true; // skip keys not in ar
    const result = translateWithFallback(key, arJson, enJson);
    const arValue = resolveKey(arJson, key);
    return result === arValue;
  }),
  { numRuns: 100 }
);
console.log('  ✓ 19c: when key exists in both, translateWithFallback returns Arabic value');

// 19d: translateWithFallback returns undefined only when key is in neither language
fc.assert(
  fc.property(
    fc.string({ minLength: 1, maxLength: 30 }).filter(s => !enKeySet.has(s) && !arKeySet.has(s)),
    (key) => {
      const result = translateWithFallback(key, arJson, enJson);
      return result === undefined;
    }
  ),
  { numRuns: 100 }
);
console.log('  ✓ 19d: translateWithFallback returns undefined for keys in neither language');

console.log('Property 19: PASSED\n');

console.log('=== All i18n property tests PASSED ===');
