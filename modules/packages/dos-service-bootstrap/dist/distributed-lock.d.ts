import Redlock, { type Lock } from 'redlock';
export declare function getRedlock(): Redlock;
export declare function acquireLock(resource: string, ttlMs: number): Promise<Lock | null>;
export declare function withLock<T>(resource: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null>;
//# sourceMappingURL=distributed-lock.d.ts.map