// ============================================
// WebSocketService — Unit Tests
// Feature: grc-frontend-integration, Task 11.3
// Standalone test file — run: pnpm exec tsx src/app/core/services/websocket-notification.test.ts
// ============================================

import { buildWsUrl, computeReconnectDelay, routeEventToSubject, WSEvent } from './websocket-notification.service';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

// ============================================
// computeReconnectDelay tests
// ============================================
console.log('--- computeReconnectDelay ---');

assert(computeReconnectDelay(0) === 1000, 'attempt 0 → 1000ms');
assert(computeReconnectDelay(1) === 2000, 'attempt 1 → 2000ms');
assert(computeReconnectDelay(2) === 4000, 'attempt 2 → 4000ms');
assert(computeReconnectDelay(3) === 8000, 'attempt 3 → 8000ms');
assert(computeReconnectDelay(4) === 16000, 'attempt 4 → 16000ms');
assert(computeReconnectDelay(5) === 30000, 'attempt 5 → 30000ms (capped)');
assert(computeReconnectDelay(6) === 30000, 'attempt 6 → 30000ms (capped)');
assert(computeReconnectDelay(10) === 30000, 'attempt 10 → 30000ms (capped)');

// ============================================
// routeEventToSubject tests
// ============================================
console.log('\n--- routeEventToSubject ---');

const mkEvent = (type: string): WSEvent => ({ type, data: {}, timestamp: new Date().toISOString() });

assert(routeEventToSubject(mkEvent('notification')) === 'notifications', 'notification → notifications');
assert(routeEventToSubject(mkEvent('notification.created')) === 'notifications', 'notification.created → notifications');
assert(routeEventToSubject(mkEvent('data_update')) === 'dataUpdates', 'data_update → dataUpdates');
assert(routeEventToSubject(mkEvent('ai.job.completed')) === 'dataUpdates', 'ai.* → dataUpdates');
assert(routeEventToSubject(mkEvent('channel_message')) === 'messages', 'channel_message → messages');
assert(routeEventToSubject(mkEvent('direct_message')) === 'messages', 'direct_message → messages');
assert(routeEventToSubject(mkEvent('unknown_type')) === null, 'unknown_type → null');
assert(routeEventToSubject(mkEvent('')) === null, 'empty type → null');
assert(routeEventToSubject(null as any) === null, 'null event → null');
assert(routeEventToSubject(undefined as any) === null, 'undefined event → null');
assert(routeEventToSubject('not-an-object' as any) === null, 'string event → null');

// ============================================
// buildWsUrl tests
// ============================================
console.log('\n--- buildWsUrl ---');

const wsUrl = buildWsUrl('/ws', { token: 'abc123', tenant: 't-1' });
assert(wsUrl.includes('/ws'), 'buildWsUrl preserves path');
assert(wsUrl.includes('token=abc123'), 'buildWsUrl appends token query param');
assert(wsUrl.includes('tenant=t-1'), 'buildWsUrl appends additional query params');

// ============================================
// Summary
// ============================================
console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
