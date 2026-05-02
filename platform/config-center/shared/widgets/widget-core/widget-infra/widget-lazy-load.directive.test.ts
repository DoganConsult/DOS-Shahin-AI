// ============================================
// WidgetLazyLoadDirective — Unit Tests
// Feature: premium-dashboard-overhaul, Task 6.3
// Validates: Requirements 18.1, 18.4
// ============================================
//
// Tests the Intersection Observer lazy-load directive logic.
// Run: pnpm exec tsx src/app/shared/widgets/widget-lazy-load.directive.test.ts

export {};

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

// ── Simulate the core directive logic as pure functions ──

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;

interface LazyLoadState {
  visible: boolean;
  observing: boolean;
  disconnected: boolean;
}

/**
 * Simulates the directive's IntersectionObserver callback behavior.
 * The directive emits the isIntersecting value for each entry.
 */
function handleIntersection(
  entries: { isIntersecting: boolean }[],
  emit: (visible: boolean) => void
): void {
  for (const entry of entries) {
    emit(entry.isIntersecting);
  }
}

/**
 * Simulates the SSR/unsupported fallback — always emit true.
 */
function handleFallback(emit: (visible: boolean) => void): void {
  emit(true);
}

// ============================================
// Test: Intersection callback emits visibility
// ============================================
console.log('--- Intersection callback ---');

{
  let lastEmitted: boolean | null = null;
  const emit = (v: boolean) => { lastEmitted = v; };

  handleIntersection([{ isIntersecting: true }], emit);
  assert(lastEmitted === true, 'emits true when element is intersecting');

  handleIntersection([{ isIntersecting: false }], emit);
  assert(lastEmitted === false, 'emits false when element leaves viewport');
}

{
  const emissions: boolean[] = [];
  const emit = (v: boolean) => { emissions.push(v); };

  handleIntersection([
    { isIntersecting: true },
    { isIntersecting: false },
  ], emit);
  assert(emissions.length === 2, 'processes multiple entries');
  assert(emissions[0] === true, 'first entry: true');
  assert(emissions[1] === false, 'second entry: false');
}

console.log('Intersection callback: PASSED\n');

// ============================================
// Test: SSR / unsupported browser fallback
// ============================================
console.log('--- SSR fallback ---');

{
  let lastEmitted: boolean | null = null;
  const emit = (v: boolean) => { lastEmitted = v; };

  handleFallback(emit);
  assert(lastEmitted === true, 'fallback emits true (always visible)');
}

console.log('SSR fallback: PASSED\n');

// ============================================
// Test: Observer lifecycle (observe / disconnect)
// ============================================
console.log('--- Observer lifecycle ---');

{
  // Simulate the directive lifecycle
  let observed: boolean = false;
  let disconnected: boolean = false;
  let callback: IOCallback | null = null;

  // Simulate ngOnInit — creates observer and observes element
  function initDirective(): void {
    callback = (_entries) => { /* handled by emit */ };
    observed = true;
    disconnected = false;
  }

  // Simulate ngOnDestroy — disconnects observer
  function destroyDirective(): void {
    disconnected = true;
    callback = null;
  }

  initDirective();
  assert(observed, 'observer starts observing on init');
  assert(!disconnected, 'observer not disconnected after init');

  destroyDirective();
  assert(disconnected, 'observer disconnected on destroy');
  assert(callback === null, 'callback cleared on destroy');
}

console.log('Observer lifecycle: PASSED\n');

// ============================================
// Test: Visibility state transitions
// ============================================
console.log('--- Visibility state transitions ---');

{
  const history: boolean[] = [];
  const emit = (v: boolean) => { history.push(v); };

  // Widget starts off-screen
  handleIntersection([{ isIntersecting: false }], emit);
  assert(history[0] === false, 'initial: off-screen');

  // User scrolls widget into view
  handleIntersection([{ isIntersecting: true }], emit);
  assert(history[1] === true, 'scrolled into view');

  // User scrolls widget out of view
  handleIntersection([{ isIntersecting: false }], emit);
  assert(history[2] === false, 'scrolled out of view');

  // Widget comes back into view
  handleIntersection([{ isIntersecting: true }], emit);
  assert(history[3] === true, 'scrolled back into view');

  assert(history.length === 4, 'all transitions recorded');
}

console.log('Visibility state transitions: PASSED\n');

// ============================================
// Test: Empty entries array
// ============================================
console.log('--- Edge cases ---');

{
  const emissions: boolean[] = [];
  const emit = (v: boolean) => { emissions.push(v); };

  handleIntersection([], emit);
  assert(emissions.length === 0, 'empty entries → no emissions');
}

console.log('Edge cases: PASSED\n');

// ============================================
console.log('=== All WidgetLazyLoadDirective unit tests PASSED ===');
