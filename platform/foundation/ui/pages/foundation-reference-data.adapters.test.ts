/**
 * Pure-adapter proof — runs under the root vitest config (environment: 'node'),
 * independent of Angular TestBed / jsdom.
 *
 * Guards the contract-normalization boundary for the Reference Data page.
 * Specifically proves:
 *   (1) Unknown envelope shapes return [] — no arbitrary pass-through.
 *   (2) Documented envelope priority (data → items → rows → array) is stable.
 *   (3) Non-array payloads inside a known envelope do NOT leak.
 */
import { describe, it, expect } from 'vitest';
import { normalizeReferenceItems } from './foundation-reference-data.adapters';

describe('normalizeReferenceItems (reference-data adapter)', () => {
  it('returns [] for null / undefined / non-object / string / number', () => {
    expect(normalizeReferenceItems(null)).toEqual([]);
    expect(normalizeReferenceItems(undefined)).toEqual([]);
    expect(normalizeReferenceItems('x')).toEqual([]);
    expect(normalizeReferenceItems(42)).toEqual([]);
    expect(normalizeReferenceItems(true)).toEqual([]);
  });

  it('returns the array unchanged when the response IS the array', () => {
    const arr = [{ code: 'A' }, { code: 'B' }];
    expect(normalizeReferenceItems(arr)).toEqual(arr);
  });

  it('extracts data → items → rows envelopes (in that order)', () => {
    expect(normalizeReferenceItems({ data: [{ code: 'A' }] })).toEqual([{ code: 'A' }]);
    expect(normalizeReferenceItems({ items: [{ code: 'B' }] })).toEqual([{ code: 'B' }]);
    expect(normalizeReferenceItems({ rows: [{ code: 'C' }] })).toEqual([{ code: 'C' }]);
    // data wins when multiple envelopes are present — documented priority.
    expect(normalizeReferenceItems({ data: [{ code: 'A' }], items: [{ code: 'X' }] })).toEqual([{ code: 'A' }]);
  });

  it('returns [] for unknown envelope shapes (no silent pass-through of arbitrary structure)', () => {
    expect(normalizeReferenceItems({ payload: [{ code: 'A' }] })).toEqual([]);
    expect(normalizeReferenceItems({ data: 'not-an-array' })).toEqual([]);
    expect(normalizeReferenceItems({ items: { notAnArray: true } })).toEqual([]);
  });
});
