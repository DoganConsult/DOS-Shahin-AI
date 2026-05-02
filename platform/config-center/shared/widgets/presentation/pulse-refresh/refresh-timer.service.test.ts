// ============================================
// RefreshTimerService — Unit Tests
// Feature: premium-dashboard-overhaul, Task 4.3
// ============================================
//
// Tests the RefreshTimerService register/unregister/pause/resume logic.
// Uses a lightweight mock approach — no Angular TestBed needed.
// Run: pnpm exec tsx src/app/shared/widgets/refresh-timer.service.test.ts

// ── Polyfill document for Node environment ──
if (typeof globalThis.document === 'undefined') {
  (globalThis as unknown).document = {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

import { RefreshTimerService } from './refresh-timer.service';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Minimal NgZone stub ──
const mockNgZone = {
  run: (fn: () => any) => fn(),
  runOutsideAngular: (fn: () => any) => fn(),
} as unknown;

(async () => {

// ============================================
// Basic register / unregister
// ============================================
console.log('--- register / unregister ---');

{
  const service = new RefreshTimerService(mockNgZone);
  let callCount = 0;
  service.register({ widgetId: 'w1', intervalSeconds: 0.05, jitterSeconds: 0 }, () => { callCount++; });

  await delay(400);
  assert(callCount >= 1, 'callback fires after interval elapses');

  service.unregister('w1');
  const countAfterUnregister = callCount;
  await delay(400);
  assert(callCount === countAfterUnregister, 'callback stops after unregister');

  service.ngOnDestroy();
}

console.log('register / unregister: PASSED\n');

// ============================================
// pauseAll / resumeAll
// ============================================
console.log('--- pauseAll / resumeAll ---');

{
  const service = new RefreshTimerService(mockNgZone);
  let callCount = 0;
  service.register({ widgetId: 'w1', intervalSeconds: 0.05, jitterSeconds: 0 }, () => { callCount++; });

  service.pauseAll();
  await delay(400);
  assert(callCount === 0, 'no callbacks while globally paused');

  service.resumeAll();
  await delay(400);
  assert(callCount >= 1, 'callbacks resume after resumeAll');

  service.ngOnDestroy();
}

console.log('pauseAll / resumeAll: PASSED\n');

// ============================================
// pauseWidget / resumeWidget
// ============================================
console.log('--- pauseWidget / resumeWidget ---');

{
  const service = new RefreshTimerService(mockNgZone);
  let count1 = 0;
  let count2 = 0;
  service.register({ widgetId: 'w1', intervalSeconds: 0.05, jitterSeconds: 0 }, () => { count1++; });
  service.register({ widgetId: 'w2', intervalSeconds: 0.05, jitterSeconds: 0 }, () => { count2++; });

  service.pauseWidget('w1');
  await delay(400);
  assert(count1 === 0, 'paused widget does not fire');
  assert(count2 >= 1, 'unpaused widget continues firing');

  service.resumeWidget('w1');
  await delay(400);
  assert(count1 >= 1, 'resumed widget fires again');

  service.ngOnDestroy();
}

console.log('pauseWidget / resumeWidget: PASSED\n');

// ============================================
// Re-register replaces previous timer
// ============================================
console.log('--- re-register ---');

{
  const service = new RefreshTimerService(mockNgZone);
  let count1 = 0;
  let count2 = 0;
  service.register({ widgetId: 'w1', intervalSeconds: 0.05, jitterSeconds: 0 }, () => { count1++; });
  service.register({ widgetId: 'w1', intervalSeconds: 0.05, jitterSeconds: 0 }, () => { count2++; });

  await delay(400);
  assert(count1 === 0, 'old callback not called after re-register');
  assert(count2 >= 1, 'new callback fires after re-register');

  service.ngOnDestroy();
}

console.log('re-register: PASSED\n');

// ============================================
// ngOnDestroy clears all
// ============================================
console.log('--- ngOnDestroy ---');

{
  const service = new RefreshTimerService(mockNgZone);
  let callCount = 0;
  service.register({ widgetId: 'w1', intervalSeconds: 0.05, jitterSeconds: 0 }, () => { callCount++; });
  service.ngOnDestroy();

  await delay(400);
  assert(callCount === 0, 'no callbacks after ngOnDestroy');
}

console.log('ngOnDestroy: PASSED\n');

console.log('=== All refresh-timer.service unit tests PASSED ===');

})();
