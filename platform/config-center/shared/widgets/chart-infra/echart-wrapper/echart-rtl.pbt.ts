// ============================================
// ECharts RTL Chart Mirroring — Property-Based Tests (Property 17)
// Feature: advanced-echarts-widgets, Task 2.7
// ============================================
//
// Standalone PBT file — no test runner required.
// Run: pnpm exec tsx src/app/shared/widgets/echart-wrapper/echart-rtl.pbt.ts
//
// Extracts the RTL mirroring logic from AppEchartComponent.applyOptions()
// into a pure function and validates it with fast-check.

import * as fc from 'fast-check';

// ============================================
// Types
// ============================================

interface XAxisEntry {
  type?: string;
  name?: string | null;
  data?: string[] | null;
  inverse?: boolean | null;
  position?: string | null;
  [key: string]: unknown;
}

interface ChartOptions {
  xAxis?: XAxisEntry | XAxisEntry[];
  series?: { type: string }[] | null;
  yAxis?: { type: string } | null;
}

// ============================================
// Extracted pure function under test
// ============================================

/**
 * Applies RTL mirroring to ECharts options.
 * Mirrors the logic from AppEchartComponent.applyOptions():
 *   - When direction is 'rtl' and xAxis exists, sets inverse = true on all entries.
 *   - When direction is 'ltr', options are returned unchanged.
 *   - When xAxis is undefined, no error occurs.
 */
export function applyRtlOptions(
  opts: ChartOptions,
  direction: 'rtl' | 'ltr',
): ChartOptions {
  const result: ChartOptions = { ...opts };

  if (direction === 'rtl') {
    if (result.xAxis) {
      if (Array.isArray(result.xAxis)) {
        result.xAxis = result.xAxis.map((ax: XAxisEntry) => ({ ...ax, inverse: true }));
      } else {
        result.xAxis = { ...result.xAxis, inverse: true };
      }
    }
  }

  return result;
}

// ============================================
// Arbitraries
// ============================================

/** Arbitrary for a single xAxis object with various properties. */
const singleXAxisArb: fc.Arbitrary<XAxisEntry> = fc.record({
  type: fc.constantFrom('category', 'value', 'time', 'log'),
  name: fc.option(fc.string({ minLength: 0, maxLength: 20 })),
  data: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 10 }),
  ),
  inverse: fc.option(fc.boolean()),
  position: fc.option(fc.constantFrom('top', 'bottom')),
});

/** Arbitrary for an array of xAxis objects (1–5 entries). */
const arrayXAxisArb = fc.array(singleXAxisArb, { minLength: 1, maxLength: 5 });

/** Arbitrary for a minimal EChartsOption-like object with optional xAxis. */
const optionsWithXAxisArb: fc.Arbitrary<ChartOptions> = fc.oneof(
  singleXAxisArb.map(ax => ({ xAxis: ax as XAxisEntry | XAxisEntry[] })),
  arrayXAxisArb.map(arr => ({ xAxis: arr as XAxisEntry | XAxisEntry[] })),
  fc.constant({} as ChartOptions),
);

/** Arbitrary for direction. */
const directionArb = fc.constantFrom<'rtl' | 'ltr'>('rtl', 'ltr');

// ============================================
// Property 17: RTL chart mirroring
// Feature: advanced-echarts-widgets, Property 17
// **Validates: Requirements 8.6**
//
// For any EChartsOption with an xAxis, when the language
// direction is RTL, the applyRtlOptions logic SHALL set
// xAxis.inverse = true on all xAxis entries.
// ============================================

console.log('--- Property 17: RTL chart mirroring ---');

// 17a: When direction is 'rtl' and xAxis is a single object, inverse SHALL be true
fc.assert(
  fc.property(singleXAxisArb, (xAxis) => {
    const result = applyRtlOptions({ xAxis }, 'rtl');
    return !Array.isArray(result.xAxis) && result.xAxis != null && result.xAxis.inverse === true;
  }),
  { numRuns: 200 },
);
console.log('  ✓ 17a: RTL + single xAxis → inverse is true');

// 17b: When direction is 'rtl' and xAxis is an array, ALL entries SHALL have inverse = true
fc.assert(
  fc.property(arrayXAxisArb, (xAxisArr) => {
    const result = applyRtlOptions({ xAxis: xAxisArr }, 'rtl');
    return (
      Array.isArray(result.xAxis) &&
      result.xAxis.length === xAxisArr.length &&
      result.xAxis.every((ax: XAxisEntry) => ax.inverse === true)
    );
  }),
  { numRuns: 200 },
);
console.log('  ✓ 17b: RTL + array xAxis → all entries have inverse = true');

// 17c: When direction is 'ltr', xAxis entries are unchanged (inverse not forced)
fc.assert(
  fc.property(optionsWithXAxisArb, (opts) => {
    const snapshot = JSON.stringify(opts);
    const result = applyRtlOptions(opts, 'ltr');
    // The xAxis in the result should be identical to the original
    return JSON.stringify(result.xAxis) === JSON.stringify(JSON.parse(snapshot).xAxis);
  }),
  { numRuns: 200 },
);
console.log('  ✓ 17c: LTR direction → xAxis entries unchanged');

// 17d: When xAxis is undefined, no error occurs for either direction
fc.assert(
  fc.property(directionArb, (direction) => {
    const result = applyRtlOptions({ series: [{ type: 'bar' }] }, direction);
    return result.xAxis === undefined;
  }),
  { numRuns: 100 },
);
console.log('  ✓ 17d: undefined xAxis → no error, xAxis remains undefined');

// 17e: RTL preserves all other xAxis properties (non-destructive spread)
fc.assert(
  fc.property(singleXAxisArb, (xAxis) => {
    const result = applyRtlOptions({ xAxis }, 'rtl');
    if (Array.isArray(result.xAxis) || result.xAxis == null) return false;
    const resultAx = result.xAxis;
    return Object.keys(xAxis).every(key => {
      if (key === 'inverse') return true; // inverse is overwritten
      return JSON.stringify(resultAx[key]) === JSON.stringify(xAxis[key]);
    });
  }),
  { numRuns: 200 },
);
console.log('  ✓ 17e: RTL preserves all other xAxis properties');

// 17f: RTL with array xAxis preserves all other properties on each entry
fc.assert(
  fc.property(arrayXAxisArb, (xAxisArr) => {
    const result = applyRtlOptions({ xAxis: xAxisArr }, 'rtl');
    if (!Array.isArray(result.xAxis)) return false;
    return result.xAxis.every((resultAx: XAxisEntry, i: number) => {
      const originalAx = xAxisArr[i];
      return Object.keys(originalAx).every(key => {
        if (key === 'inverse') return true;
        return JSON.stringify(resultAx[key]) === JSON.stringify(originalAx[key]);
      });
    });
  }),
  { numRuns: 200 },
);
console.log('  ✓ 17f: RTL + array xAxis preserves all other properties per entry');

// 17g: Original options object is not mutated (immutability)
fc.assert(
  fc.property(optionsWithXAxisArb, directionArb, (opts, direction) => {
    const snapshot = JSON.stringify(opts);
    applyRtlOptions(opts, direction);
    return JSON.stringify(opts) === snapshot;
  }),
  { numRuns: 200 },
);
console.log('  ✓ 17g: Original options object is not mutated');

console.log('Property 17: PASSED\n');

// ============================================
console.log('=== All echart-rtl property tests PASSED ===');
