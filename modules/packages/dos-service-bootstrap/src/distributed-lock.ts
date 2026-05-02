// Redlock-based distributed locks for singleton jobs across multiple service
// instances (HITL expiry cron, leader-elected cleanups, etc.).
//
// The outbox dispatcher already uses Postgres FOR UPDATE SKIP LOCKED for
// per-row locking and does NOT need this. Use this for jobs where exactly
// one instance should run, ever — e.g. scheduled crons that mutate global
// state.
//
// Usage:
//   import { acquireLock } from '@dos/service-bootstrap/distributed-lock';
//   const lock = await acquireLock('hitl-expiry-sweep', 30_000);
//   if (!lock) return; // another instance is running
//   try { await doWork(); } finally { await lock.release(); }

import Redlock, { type Lock } from 'redlock';
import Redis, { type Redis as RedisClient } from 'ioredis';

let _redlock: Redlock | null = null;

function buildRedis(): RedisClient {
  const url = process.env.REDIS_URL;
  if (url) return new Redis(url);
  return new Redis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_LOCK_DB ?? '3', 10),
    maxRetriesPerRequest: null,
  });
}

export function getRedlock(): Redlock {
  if (_redlock) return _redlock;
  _redlock = new Redlock([buildRedis()], {
    driftFactor: 0.01,
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 100,
    automaticExtensionThreshold: 500,
  });
  _redlock.on('error', () => { /* swallow — lock attempts will fail individually */ });
  return _redlock;
}

export async function acquireLock(
  resource: string,
  ttlMs: number,
): Promise<Lock | null> {
  try {
    return await getRedlock().acquire([`dos:lock:${resource}`], ttlMs);
  } catch {
    return null;
  }
}

export async function withLock<T>(
  resource: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const lock = await acquireLock(resource, ttlMs);
  if (!lock) return null;
  try {
    return await fn();
  } finally {
    try { await lock.release(); } catch { /* lock TTL expired naturally */ }
  }
}
