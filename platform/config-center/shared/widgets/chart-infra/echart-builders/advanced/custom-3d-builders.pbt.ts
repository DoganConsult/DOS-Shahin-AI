// ============================================
// Custom/3D Builders — Property-Based Tests
// Feature: advanced-echarts-widgets, Task 9.3
// ============================================
//
// Properties tested:
//   P1  (custom subset): Options builder output validity
//   P3:  Custom builder JSON round-trip (excluding renderItem)
//   P4:  Serialization round-trip
//   P10: Custom series renderItem structural invariant
//
// **Validates: Requirements 7.7, 18.1–18.5**
//
// Standalone PBT file — no test runner required.
// Run: npx tsx src/app/shared/widgets/echart-builders/custom-3d-builders.pbt.ts

import * as fc from 'fast-check';
import {
  buildComplianceTectonicOptions,
  buildGanttTimelineOptions,
  buildIncidentSwimLaneOptions,
  buildMaturityOrbitOptions,
  buildRiskBowtieOptions,
  buildEvidenceGlobeOptions,
} from './custom-3d-builders';
import { serializeOptions, deserializeOptions } from './serialization';
import type {
import { GrcRecord } from '@app/core/models/shared.types';
  GanttData,
  SwimLaneData,
  RadarData,
  BowtieData,
  GlobeData,
} from '../builder-types';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcRecord } from '@app/core/models/shared.types';

// ============================================
// Arbitraries
// ============================================

/** Generate a date string like '2024-01-15' */
const arbDateStr: fc.Arbitrary<string> = fc
  .record({
    y: fc.integer({ min: 2020, max: 2030 }),
    m: fc.integer({ min: 1, max: 12 }),
    d: fc.integer({ min: 1, max: 28 }),
  })
  .map(({ y, m, d }) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

const arbGanttData: fc.Arbitrary<GanttData> = fc.record({
  tasks: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      start: arbDateStr,
      end: arbDateStr,
      progress: fc.double({ min: 0, max: 1, noNaN: true }),
      category: fc.option(fc.string({ minLength: 1, maxLength: 15 })),
    }),
    { minLength: 1, maxLength: 10 },
  ),
});

/**
 * SwimLaneData arbitrary — items reference existing lanes.
 */
const arbSwimLaneData: fc.Arbitrary<SwimLaneData> = fc
  .array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 1, maxLength: 6 })
  .chain((lanes) =>
    fc.record({
      lanes: fc.constant(lanes),
      items: fc.array(
        fc.record({
          lane: fc.constantFrom(...lanes),
          start: arbDateStr,
          end: arbDateStr,
          label: fc.string({ minLength: 1, maxLength: 20 }),
          status: fc.constantFrom('open', 'in-progress', 'closed', 'blocked'),
        }),
        { minLength: 1, maxLength: 12 },
      ),
    }),
  );

const arbRadarData: fc.Arbitrary<RadarData> = fc.nat({ max: 8 }).chain((n) => {
  const count = n + 2; // at least 2 indicators
  return fc.record({
    indicators: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 15 }),
        max: fc.double({ min: 1, max: 100, noNaN: true }),
      }),
      { minLength: count, maxLength: count },
    ),
    series: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 15 }),
        values: fc.array(fc.double({ min: 0, max: 100, noNaN: true }), {
          minLength: count,
          maxLength: count,
        }),
      }),
      { minLength: 1, maxLength: 5 },
    ),
  });
});

/**
 * BowtieData arbitrary — controls.target references existing cause/consequence names.
 */
const arbBowtieData: fc.Arbitrary<BowtieData> = fc
  .record({
    riskEvent: fc.string({ minLength: 1, maxLength: 30 }),
    causes: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        likelihood: fc.double({ min: 0, max: 1, noNaN: true }),
      }),
      { minLength: 1, maxLength: 6 },
    ),
    consequences: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        impact: fc.double({ min: 0, max: 100, noNaN: true }),
      }),
      { minLength: 1, maxLength: 6 },
    ),
  })
  .chain((base) => {
    const allTargets = [
      ...base.causes.map((c) => c.name),
      ...base.consequences.map((c) => c.name),
    ];
    // Ensure at least one target exists
    const targets = allTargets.length > 0 ? allTargets : ['default-target'];
    return fc.record({
      riskEvent: fc.constant(base.riskEvent),
      causes: fc.constant(base.causes),
      consequences: fc.constant(base.consequences),
      controls: fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 20 }),
          type: fc.constantFrom('preventive' as const, 'detective' as const, 'corrective' as const),
          target: fc.constantFrom(...targets),
        }),
        { minLength: 0, maxLength: 8 },
      ),
    });
  });

const arbGlobeData: fc.Arbitrary<GlobeData> = fc.record({
  points: fc.array(
    fc.record({
      lat: fc.double({ min: -90, max: 90, noNaN: true }),
      lng: fc.double({ min: -180, max: 180, noNaN: true }),
      label: fc.string({ minLength: 1, maxLength: 20 }),
      value: fc.nat({ max: 10000 }),
    }),
    { minLength: 0, maxLength: 10 },
  ),
  regions: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 15 }),
      color: fc.string({ minLength: 6, maxLength: 6 }).map((h: string) => `#${h}`),
      coordinates: fc.array(
        fc.tuple(
          fc.double({ min: -180, max: 180, noNaN: true }),
          fc.double({ min: -90, max: 90, noNaN: true }),
        ) as fc.Arbitrary<[number, number]>,
        { minLength: 3, maxLength: 8 },
      ),
    }),
    { minLength: 0, maxLength: 5 },
  ),
});

// ============================================
// Helper: assert custom output validity
// ============================================

function assertCustomOutput(label: string, result: Record<string, unknown>): boolean {
  if (result == null || typeof result !== 'object') return false;
  const opts = result as Record<string, unknown>;
  const series = opts['series'];
  if (!Array.isArray(series) || series.length === 0) return false;
  return series.some((s) => s && s.type === 'custom');
}

// ============================================
// Helper: strip all function values from an object tree
// ============================================

function stripFunctions(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return undefined;
  if (Array.isArray(obj)) return obj.map(stripFunctions);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value !== 'function') {
        result[key] = stripFunctions(value);
      }
    }
    return result;
  }
  return obj;
}

// ============================================
// Helper: deep-equal comparison
// ============================================

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;

  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, (b as unknown[])[i]));
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();
  if (aKeys.length !== bKeys.length) return false;
  if (!aKeys.every((k, i) => k === bKeys[i])) return false;
  return aKeys.every((k) => deepEqual(aObj[k], bObj[k]));
}

// ============================================
// Helper: replace function values with "__function__" placeholder
// (mirrors what serializeOptions does)
// ============================================

function replaceFunctionsWithPlaceholder(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'function') return '__function__';
  if (Array.isArray(obj)) return obj.map(replaceFunctionsWithPlaceholder);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = replaceFunctionsWithPlaceholder(value);
    }
    return result;
  }
  return obj;
}

// ============================================
// Builder registry for testing
// ============================================

const customBuilders: Array<{
  name: string;
  fn: (data: GrcRecord) => GrcRecord;
  arb: fc.Arbitrary<unknown>;
}> = [
  { name: 'buildComplianceTectonicOptions', fn: buildComplianceTectonicOptions, arb: arbGanttData },
  { name: 'buildGanttTimelineOptions', fn: buildGanttTimelineOptions, arb: arbGanttData },
  { name: 'buildIncidentSwimLaneOptions', fn: buildIncidentSwimLaneOptions, arb: arbSwimLaneData },
  { name: 'buildMaturityOrbitOptions', fn: buildMaturityOrbitOptions, arb: arbRadarData },
  { name: 'buildRiskBowtieOptions', fn: buildRiskBowtieOptions, arb: arbBowtieData },
  { name: 'buildEvidenceGlobeOptions', fn: buildEvidenceGlobeOptions, arb: arbGlobeData },
];

// ============================================
// Property 1 (custom subset): Options builder output validity
// Feature: advanced-echarts-widgets, Property 1 (custom subset)
// **Validates: Requirements 7.1–7.6**
//
// For any valid input data for each of the 6 custom builders,
// the output SHALL be a non-null object with a `series` array
// containing at least one entry with `type: 'custom'`.
// ============================================

console.log('--- Property 1 (custom subset): Options builder output validity ---');

for (const { name, fn, arb } of customBuilders) {
  fc.assert(
    fc.property(arb, (data) => {
      return assertCustomOutput(name, fn(data));
    }),
    { numRuns: 100 },
  );
  console.log(`  ✓ ${name} always produces custom series`);
}

console.log('Property 1 (custom subset): PASSED\n');

// ============================================
// Property 3: Custom builder JSON round-trip (excluding renderItem)
// Feature: advanced-echarts-widgets, Property 3
// **Validates: Requirements 18.2**
//
// For any custom-series builder and any valid input data,
// removing the `renderItem` function from each custom series entry
// and then performing JSON.parse(JSON.stringify(result)) SHALL
// produce a deep-equal object to the original with renderItem removed.
// ============================================

console.log('--- Property 3: Custom builder JSON round-trip (excluding renderItem) ---');

for (const { name, fn, arb } of customBuilders) {
  fc.assert(
    fc.property(arb, (data) => {
      const result = fn(data);
      const stripped = stripFunctions(result);
      const roundTripped = JSON.parse(JSON.stringify(stripped));
      const equal = deepEqual(stripped, roundTripped);
      if (!equal) {
        console.error(`Round-trip failed for ${name}`);
      }
      return equal;
    }),
    { numRuns: 100 },
  );
  console.log(`  ✓ ${name} JSON round-trip (excluding renderItem)`);
}

console.log('Property 3: PASSED\n');

// ============================================
// Property 4: Serialization round-trip
// Feature: advanced-echarts-widgets, Property 4
// **Validates: Requirements 18.3, 18.4, 18.5**
//
// For any valid EChartsOption produced by any custom builder,
// `deserializeOptions(serializeOptions(options))` SHALL produce
// an object where all non-function values are deep-equal to the
// original (with functions becoming "__function__" placeholders
// that are restored to no-op functions).
// ============================================

console.log('--- Property 4: Serialization round-trip ---');

for (const { name, fn, arb } of customBuilders) {
  fc.assert(
    fc.property(arb, (data) => {
      const original = fn(data);
      const serialized = serializeOptions(original);
      const deserialized = deserializeOptions(serialized);

      // Non-function values should be preserved.
      // Functions become "__function__" → restored to no-op functions.
      // Compare the non-function parts: replace functions with placeholder in original,
      // then compare with deserialized (where placeholders became no-op functions).
      const originalWithPlaceholders = replaceFunctionsWithPlaceholder(original);
      const deserializedWithPlaceholders = replaceFunctionsWithPlaceholder(deserialized);
      const equal = deepEqual(originalWithPlaceholders, deserializedWithPlaceholders);
      if (!equal) {
        console.error(`Serialization round-trip failed for ${name}`);
      }
      return equal;
    }),
    { numRuns: 100 },
  );
  console.log(`  ✓ ${name} serialization round-trip`);
}

// Also test with an arbitrary plain object (no functions) for pure round-trip
fc.assert(
  fc.property(
    fc.jsonValue() as fc.Arbitrary<unknown>,
    (obj) => {
      // Only test objects/arrays (skip primitives)
      if (obj === null || typeof obj !== 'object') return true;
      const serialized = serializeOptions(obj as unknown);
      const deserialized = deserializeOptions(serialized);
      return deepEqual(obj, deserialized);
    },
  ),
  { numRuns: 100 },
);
console.log('  ✓ Arbitrary plain object serialization round-trip');

console.log('Property 4: PASSED\n');

// ============================================
// Property 10: Custom series renderItem structural invariant
// Feature: advanced-echarts-widgets, Property 10
// **Validates: Requirements 7.7**
//
// For any custom-series builder and any valid input data,
// the output SHALL contain at least one series entry with
// `type: 'custom'` and a `renderItem` property that is a function.
// ============================================

console.log('--- Property 10: Custom series renderItem structural invariant ---');

for (const { name, fn, arb } of customBuilders) {
  fc.assert(
    fc.property(arb, (data) => {
      const result = fn(data);
      if (result == null || typeof result !== 'object') return false;
      const opts = result as Record<string, unknown>;
      const series = opts['series'];
      if (!Array.isArray(series) || series.length === 0) return false;
      return series.some(
        (s: GrcRecord) =>
          s &&
          s.type === 'custom' &&
          typeof s.renderItem === 'function',
      );
    }),
    { numRuns: 100 },
  );
  console.log(`  ✓ ${name} has renderItem function in custom series`);
}

console.log('Property 10: PASSED\n');

// ============================================
console.log('=== All custom-3d-builders property tests PASSED ===');
