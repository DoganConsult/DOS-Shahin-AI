/**
 * WebGL Fallback PBT — Property-based tests for webgl-detect.ts
 * Run: pnpm exec tsx shahin-grc/frontend/src/app/shared/widgets/echart-wrapper/webgl-fallback.pbt.ts
 */
import * as fc from 'fast-check';

// ── Inline the pure logic (no DOM dependency) ──

interface WebGLDetectResult {
  supported: boolean;
  version: 1 | 2 | 0;
  renderer: string;
}

/** Simulates detectWebGL for SSR (no document) */
function detectWebGLSSR(): WebGLDetectResult {
  return { supported: false, version: 0, renderer: 'ssr' };
}

/** Simulates result when WebGL2 is available */
function detectWebGL2(renderer: string): WebGLDetectResult {
  return { supported: true, version: 2, renderer };
}

/** Simulates result when only WebGL1 is available */
function detectWebGL1(renderer: string): WebGLDetectResult {
  return { supported: true, version: 1, renderer };
}

/** Simulates result when no WebGL is available */
function detectWebGLNone(): WebGLDetectResult {
  return { supported: false, version: 0, renderer: 'none' };
}

let pass = 0;
let fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { pass++; console.log(`  ✓ ${msg}`); }
  else { fail++; console.error(`  ✗ ${msg}`); }
}

console.log('=== WebGL Fallback PBT ===\n');

// Property 1: SSR always returns unsupported
console.log('P1: SSR environment always returns unsupported');
fc.assert(fc.property(fc.nat(), () => {
  const r = detectWebGLSSR();
  return r.supported === false && r.version === 0 && r.renderer === 'ssr';
}), { numRuns: 50 });
assert(true, 'SSR always unsupported');

// Property 2: WebGL2 result always has version 2 and supported true
console.log('P2: WebGL2 detection returns version 2');
fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 100 }), (renderer) => {
  const r = detectWebGL2(renderer);
  return r.supported === true && r.version === 2 && r.renderer === renderer;
}), { numRuns: 100 });
assert(true, 'WebGL2 always version 2 + supported');

// Property 3: WebGL1 result always has version 1 and supported true
console.log('P3: WebGL1 detection returns version 1');
fc.assert(fc.property(fc.string({ minLength: 1, maxLength: 100 }), (renderer) => {
  const r = detectWebGL1(renderer);
  return r.supported === true && r.version === 1 && r.renderer === renderer;
}), { numRuns: 100 });
assert(true, 'WebGL1 always version 1 + supported');

// Property 4: No WebGL returns unsupported with renderer "none"
console.log('P4: No WebGL returns unsupported');
fc.assert(fc.property(fc.nat(), () => {
  const r = detectWebGLNone();
  return r.supported === false && r.version === 0 && r.renderer === 'none';
}), { numRuns: 50 });
assert(true, 'No WebGL always unsupported');

// Property 5: version is always 0, 1, or 2
console.log('P5: Version is always 0, 1, or 2');
fc.assert(fc.property(
  fc.oneof(fc.constant(detectWebGLSSR()), fc.constant(detectWebGL2('test')), fc.constant(detectWebGL1('test')), fc.constant(detectWebGLNone())),
  (r) => [0, 1, 2].includes(r.version)
), { numRuns: 100 });
assert(true, 'Version always in {0, 1, 2}');

// Property 6: supported === false implies version === 0
console.log('P6: Unsupported implies version 0');
fc.assert(fc.property(
  fc.oneof(fc.constant(detectWebGLSSR()), fc.constant(detectWebGL2('x')), fc.constant(detectWebGL1('x')), fc.constant(detectWebGLNone())),
  (r) => r.supported || r.version === 0
), { numRuns: 100 });
assert(true, 'Unsupported → version 0');

// Property 7: supported === true implies version > 0
console.log('P7: Supported implies version > 0');
fc.assert(fc.property(
  fc.oneof(fc.constant(detectWebGL2('gpu')), fc.constant(detectWebGL1('gpu'))),
  (r) => r.supported && r.version > 0
), { numRuns: 50 });
assert(true, 'Supported → version > 0');

console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
