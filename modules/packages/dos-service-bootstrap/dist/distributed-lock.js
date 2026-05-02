"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedlock = getRedlock;
exports.acquireLock = acquireLock;
exports.withLock = withLock;
const redlock_1 = __importDefault(require("redlock"));
const ioredis_1 = __importDefault(require("ioredis"));
let _redlock = null;
function buildRedis() {
    const url = process.env.REDIS_URL;
    if (url)
        return new ioredis_1.default(url);
    return new ioredis_1.default({
        host: process.env.REDIS_HOST ?? '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_LOCK_DB ?? '3', 10),
        maxRetriesPerRequest: null,
    });
}
function getRedlock() {
    if (_redlock)
        return _redlock;
    _redlock = new redlock_1.default([buildRedis()], {
        driftFactor: 0.01,
        retryCount: 3,
        retryDelay: 200,
        retryJitter: 100,
        automaticExtensionThreshold: 500,
    });
    _redlock.on('error', () => { });
    return _redlock;
}
async function acquireLock(resource, ttlMs) {
    try {
        return await getRedlock().acquire([`dos:lock:${resource}`], ttlMs);
    }
    catch {
        return null;
    }
}
async function withLock(resource, ttlMs, fn) {
    const lock = await acquireLock(resource, ttlMs);
    if (!lock)
        return null;
    try {
        return await fn();
    }
    finally {
        try {
            await lock.release();
        }
        catch { /* lock TTL expired naturally */ }
    }
}
//# sourceMappingURL=distributed-lock.js.map