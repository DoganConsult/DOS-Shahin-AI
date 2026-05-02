/**
 * Wave 10 — unit test for hash-chain pure functions.
 * Doesn't require a database; tests computeEntryHash deterministically.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { computeEntryHash, __WAVE_10_GENESIS_HASH } = require('../../dist/application/audit-hash-chain/audit-hash-chain.service.js');

test('genesis hash is 64 zeros', () => {
  assert.equal(__WAVE_10_GENESIS_HASH, '0'.repeat(64));
  assert.equal(__WAVE_10_GENESIS_HASH.length, 64);
});

test('computeEntryHash is deterministic', () => {
  const row = {
    id: 'abc',
    tenantId: 't1',
    eventType: 'test.event',
    payload: { a: 1 },
    userId: 'u1',
    createdAt: '2026-04-30T00:00:00Z',
    prevHash: __WAVE_10_GENESIS_HASH,
    chainSeq: 1,
  };
  const h1 = computeEntryHash(__WAVE_10_GENESIS_HASH, row);
  const h2 = computeEntryHash(__WAVE_10_GENESIS_HASH, row);
  assert.equal(h1, h2);
  assert.equal(h1.length, 64);
  assert.match(h1, /^[0-9a-f]{64}$/);
});

test('different prev_hash produces different entry_hash', () => {
  const row = {
    id: 'abc',
    tenantId: 't1',
    eventType: 'test.event',
    payload: { a: 1 },
    userId: 'u1',
    createdAt: '2026-04-30T00:00:00Z',
    prevHash: __WAVE_10_GENESIS_HASH,
    chainSeq: 1,
  };
  const h1 = computeEntryHash(__WAVE_10_GENESIS_HASH, row);
  const otherPrev = 'a'.repeat(64);
  const h2 = computeEntryHash(otherPrev, { ...row, prevHash: otherPrev });
  assert.notEqual(h1, h2);
});

test('payload mutation produces different entry_hash (tamper detected)', () => {
  const baseline = {
    id: 'abc', tenantId: 't1', eventType: 'test.event',
    payload: { amount: 100 }, userId: 'u1',
    createdAt: '2026-04-30T00:00:00Z',
    prevHash: __WAVE_10_GENESIS_HASH, chainSeq: 1,
  };
  const tampered = { ...baseline, payload: { amount: 999 } };
  const h1 = computeEntryHash(__WAVE_10_GENESIS_HASH, baseline);
  const h2 = computeEntryHash(__WAVE_10_GENESIS_HASH, tampered);
  assert.notEqual(h1, h2);
});

test('chain_seq order preserved in hash input', () => {
  const a = {
    id: 'a', tenantId: 't1', eventType: 'e',
    payload: null, userId: null,
    createdAt: '2026-04-30T00:00:00Z',
    prevHash: __WAVE_10_GENESIS_HASH, chainSeq: 1,
  };
  const b = { ...a, chainSeq: 2 };
  assert.notEqual(
    computeEntryHash(__WAVE_10_GENESIS_HASH, a),
    computeEntryHash(__WAVE_10_GENESIS_HASH, b),
  );
});
